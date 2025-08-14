import { drawChart } from './chart.js';
import { fetchReadings } from './api/readings.js';
import { fetchSpecies, fetchUserPlants, createUserPlant, createSpeciesByName, searchSpecies, fetchThresholdsByUserPlant } from './api/plants.js';
import { showNotification } from './notifications.js';

const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

createApp({
    setup() {
        const authed = ref(false);
        const authTitle = computed(() => (authed.value ? 'Sign out' : 'Sign in'));
        const showAuthModal = ref(false);
        const showAddModal = ref(false);
        const authTab = ref('login');

        const loginForm = ref({ identifier: '', password: '' });
        const registerForm = ref({ email: '', username: '', password: '' });

        const species = ref([]); // from species DB
        const speciesSuggestions = ref([]);
        const speciesError = ref('');
        const userPlants = ref([]); // [{id,label,species,species_id}]
        const selectedUserPlantId = ref('');
        const dataType = ref('ph');

        const addForm = ref({ user_plant_id: '', ph: null, moisture: null });
        const newPlantForm = ref({ species_name: '', label: '' });
        const chartData = ref([]);
        const thresholds = ref(null);

        function notify(msg) { showNotification(msg); }

        async function fetchMe() {
            try {
                const r = await fetch('./api/auth.php');
                const s = await r.json();
                authed.value = !!s.authenticated;
            } catch { }
        }

        function onAuthClick() {
            if (authed.value) {
                fetch('./api/logout.php').then(() => {
                    authed.value = false;
                    notify('Signed out');
                    // Clear user-specific state and chart when signing out
                    userPlants.value = [];
                    selectedUserPlantId.value = '';
                    chartData.value = [];
                    thresholds.value = null;
                    if (window.plantsChartInstance) {
                        try { window.plantsChartInstance.destroy(); } catch { }
                        window.plantsChartInstance = null;
                    }
                });
            } else {
                showAuthModal.value = true;
            }
        }

        function closeModals() {
            showAuthModal.value = false;
            showAddModal.value = false;
        }

        async function login() {
            try {
                const res = await fetch('./api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginForm.value)
                });
                const result = await res.json();
                if (result.status === 'success') {
                    authed.value = true;
                    showAuthModal.value = false;
                    notify('Signed in');
                    // Immediately load plants and render chart scoped to this user
                    await fetchPlants();
                    await render();
                } else {
                    notify('Error: ' + result.message);
                }
            } catch (e) {
                notify('Error: ' + e.message);
            }
        }

        async function register() {
            try {
                const res = await fetch('./api/register.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(registerForm.value)
                });
                const result = await res.json();
                if (result.status === 'success') {
                    notify('Account created. You can sign in now.');
                    authTab.value = 'login';
                } else {
                    notify('Error: ' + result.message);
                }
            } catch (e) {
                notify('Error: ' + e.message);
            }
        }

        function openAddModal() {
            if (!authed.value) {
                notify('Please sign in to add a reading');
                showAuthModal.value = true;
                return;
            }
            addForm.value.user_plant_id = selectedUserPlantId.value || (userPlants.value[0]?.id || '');
            showAddModal.value = true;
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
                    showAddModal.value = false;
                    await render();
                } else {
                    notify('Error: ' + r.message);
                }
            } catch (e) {
                notify('Error: ' + e.message);
            }
        }

        async function fetchPlants() {
            try {
                // Preload empty to warm endpoint (optional)
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

            // Try to find existing species by exact name (case-insensitive)
            // Use search suggestions as source of truth
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

        // Live species suggestions when typing
        watch(() => newPlantForm.value.species_name, async (val) => {
            speciesError.value = '';
            if ((val || '').length >= 2) {
                speciesSuggestions.value = await searchSpecies(val);
            } else {
                speciesSuggestions.value = [];
            }
        });

        async function render() {
            // fetch data first and update reactive state
            const data = await fetchReadings(selectedUserPlantId.value || undefined);
            chartData.value = data;
            // fetch thresholds for selected plant
            thresholds.value = await fetchThresholdsByUserPlant(selectedUserPlantId.value || undefined);
            // draw only if we have data, after DOM updates reveal the canvas
            await nextTick();
            if (chartData.value && chartData.value.length) {
                drawChart(dataType.value, chartData.value, thresholds.value);
            } else {
                // no data: ensure any existing chart is destroyed
                if (window.plantsChartInstance) {
                    try { window.plantsChartInstance.destroy(); } catch { }
                    window.plantsChartInstance = null;
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

        onMounted(async () => {
            await fetchMe();
            await fetchPlants();
            await render();
        });

        // Keep body scroll locked when any modal is open
        watch([showAuthModal, showAddModal], ([a, b]) => {
            const open = !!(a || b);
            document.body.classList.toggle('modal-open', open);
        });

        return {
            authed,
            authTitle,
            showAuthModal,
            showAddModal,
            authTab,
            loginForm,
            registerForm,
            onAuthClick,
            closeModals,
            login,
            register,
            species,
            speciesSuggestions,
            speciesError,
            userPlants,
            selectedUserPlantId,
            dataType,
            onPlantChange,
            onTypeChange,
            openAddModal,
            addForm,
            newPlantForm,
            addUserPlant,
            fetchPlants,
            saveReading,
            chartData
            , thresholds
        };
    }
}).mount('#app');
