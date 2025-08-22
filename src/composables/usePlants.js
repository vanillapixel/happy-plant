import { ref } from 'vue';
import { drawChart } from '../chart.js';
import { fetchReadings } from '../api/readings.js';
import { fetchSpecies, fetchUserPlants, createUserPlant, searchSpecies, fetchThresholdsByUserPlant } from '../api/plants.js';

export function usePlants() {
    const species = ref([]);
    const speciesSuggestions = ref([]);
    const speciesError = ref('');
    const userPlants = ref([]);
    const selectedUserPlantId = ref('');
    const dataType = ref('ph');
    const addForm = ref({ user_plant_id: '', ph: null, moisture: null });
    const newPlantForm = ref({ species_name: '', label: '' });
    const chartData = ref([]);
    const thresholds = ref(null);

    function notify(msg) {
        if (typeof window !== 'undefined' && window.showNotification) {
            try { window.showNotification(msg); } catch { }
        }
    }

    async function fetchPlants() {
        try {
            species.value = await fetchSpecies();
            userPlants.value = await fetchUserPlants();
            if (!selectedUserPlantId.value && userPlants.value.length) {
                selectedUserPlantId.value = String(userPlants.value[0].id);
            }
        } catch { }
    }

    async function addUserPlant() {
        const label = (newPlantForm.value.label || '').trim();
        const speciesName = (newPlantForm.value.species_name || '').trim();
        if (!label || !speciesName) return;

        // Require selecting one of suggestions
        if (speciesName.length >= 2) {
            const suggestions = await searchSpecies(speciesName);
            speciesSuggestions.value = suggestions;
            const exact = suggestions.find(s => s.common_name.toLowerCase() === speciesName.toLowerCase() || (s.scientific_name && s.scientific_name.toLowerCase() === speciesName.toLowerCase()));
            if (!exact) {
                speciesError.value = 'Please select one of the suggested options';
                return;
            }
            speciesError.value = '';
        }

        const exact = speciesSuggestions.value.find(s => s.common_name.toLowerCase() === speciesName.toLowerCase() || (s.scientific_name && s.scientific_name.toLowerCase() === speciesName.toLowerCase()));
        const speciesId = exact ? Number(exact.id) : null;

        const res = await createUserPlant(speciesId, label);
        if (res.status === 'success') {
            await fetchPlants();
            if (res.id) selectedUserPlantId.value = String(res.id);
            newPlantForm.value.species_name = '';
            newPlantForm.value.label = '';
            await render();
        } else {
            notify('Error creating plant');
        }
    }

    async function saveReading() {
        try {
            const res = await fetch('./api/save-reading.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_plant_id: addForm.value.user_plant_id ? Number(addForm.value.user_plant_id) : undefined,
                    ph: addForm.value.ph,
                    moisture: addForm.value.moisture
                })
            });
            const r = await res.json();
            if (r.status === 'success') {
                notify('Reading saved successfully!');
                await render();
                return true;
            } else {
                notify('Error: ' + r.message);
            }
        } catch (e) {
            notify('Error: ' + e.message);
        }
        return false;
    }

    async function render() {
        const data = await fetchReadings(selectedUserPlantId.value || undefined);
        chartData.value = data;
        thresholds.value = await fetchThresholdsByUserPlant(selectedUserPlantId.value || undefined);
        if (typeof window !== 'undefined') {
            if (chartData.value && chartData.value.length) {
                drawChart(dataType.value, chartData.value, thresholds.value);
            } else {
                if (window.plantsChartInstance) {
                    try { window.plantsChartInstance.destroy(); } catch { }
                    window.plantsChartInstance = null;
                }
            }
        }
    }

    function onPlantChange() {
        if (!addForm.value.user_plant_id) {
            addForm.value.user_plant_id = selectedUserPlantId.value || '';
        }
        render();
    }

    function onTypeChange() { render(); }

    return {
        species,
        speciesSuggestions,
        speciesError,
        userPlants,
        selectedUserPlantId,
        dataType,
        addForm,
        newPlantForm,
        chartData,
        thresholds,
        fetchPlants,
        addUserPlant,
        saveReading,
        render,
        onPlantChange,
        onTypeChange,
    };
}
