import { drawChart } from './chart.js';
import { fetchReadings } from './api/readings.js';
import { fetchSpecies, fetchUserPlants, createUserPlant, createSpeciesByName, searchSpecies, fetchThresholdsByUserPlant } from './api/plants.js';
import { showNotification } from './notifications.js';
import { loadSpeciesTranslations, tSpecies } from './i18n/index.js';
import { plantSuggestions, getPlantSuggestions, computeSliderStyle } from './plant-suggestions.js';
import { getWaterSuggestion } from './api/weather.js';

const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

createApp({
    setup() {
        const authed = ref(false);
        const authTitle = computed(() => (authed.value ? 'Sign out' : 'Sign in'));
        const showAuthModal = ref(false);
        const showAddModal = ref(false);
        const authTab = ref('login');

        const loginForm = ref({ identifier: '', password: '' });
        const registerForm = ref({ email: '', username: '', password: '', city: '' });

        const species = ref([]); // from species DB
        const locale = ref('en');
        const speciesLocaleMap = ref({});
        const speciesSuggestions = ref([]);
        const speciesError = ref('');
        const userPlants = ref([]); // [{id,label,species,species_id}]
        const selectedUserPlantId = ref('');
        const dataType = ref('ph');

        const addForm = ref({ user_plant_id: '', ph: null, moisture: null, fertility: null });
        const newPlantForm = ref({ species_name: '', label: '' });
        const chartData = ref([]);
        const thresholds = ref(null);
        const weather = ref({ city: 'Utrecht', location: '', today: null, next: [], error: '' });

        const currentSpeciesCommon = computed(() => {
            const up = userPlants.value.find(p => String(p.id) === String(addForm.value.user_plant_id));
            return (up?.species || '').toLowerCase();
        });
        const currentPlantSuggestions = computed(() => {
            return getPlantSuggestions(currentSpeciesCommon.value, locale.value);
        });

        // Slider styling + state
        const phInRange = computed(() => {
            if (addForm.value.ph == null) return false;
            const lo = thresholds.value?.ph_min ?? 6;
            const hi = thresholds.value?.ph_max ?? 7;
            return addForm.value.ph >= lo && addForm.value.ph <= hi;
        });
        const moistureInRange = computed(() => {
            if (addForm.value.moisture == null) return false;
            const lo = thresholds.value?.moisture_morning ?? 60;
            const hi = thresholds.value?.moisture_night ?? 75;
            // treat acceptable inside [lo, hi]
            return addForm.value.moisture >= lo && addForm.value.moisture <= hi;
        });
        const phSliderStyle = computed(() => {
            const lo = thresholds.value?.ph_min ?? 6;
            const hi = thresholds.value?.ph_max ?? 7;
            return computeSliderStyle(lo, hi, 0, 14, phInRange.value);
        });
        const moistureSliderStyle = computed(() => {
            const lo = thresholds.value?.moisture_morning ?? 60;
            const hi = thresholds.value?.moisture_night ?? 75;
            return computeSliderStyle(lo, hi, 0, 100, moistureInRange.value);
        });

        function notify(msg) { showNotification(msg); }

        async function fetchMe() {
            try {
                const r = await fetch('./api/auth.php');
                const s = await r.json();
                authed.value = !!s.authenticated;
                if (s.city) {
                    weather.value.city = s.city || 'Utrecht';
                } else {
                    weather.value.city = 'Utrecht';
                }
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
                    if (result.city) weather.value.city = result.city || 'Utrecht';
                    // Immediately load plants and render chart scoped to this user
                    await fetchPlants();
                    await render();
                    await refreshWeather();
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
                        moisture: addForm.value.moisture,
                        fertility: addForm.value.fertility
                    })
                });
                const r = await res.json();
                if (r.status === 'success') {
                    notify('Reading saved successfully!');
                    // Keep modal open for rapid entry; clear inputs for next reading
                    await render();
                    addForm.value.ph = null;
                    addForm.value.moisture = null;
                    // keep fertility selection for convenience (comment out next line to retain)
                    // addForm.value.fertility = null;
                } else {
                    notify('Error: ' + r.message);
                }
            } catch (e) {
                notify('Error: ' + e.message);
            }
        }

        // Navigate between user's plants inside the Add Reading modal
        function goToPlant(offset) {
            const list = userPlants.value;
            if (!list.length) return;
            let idx = list.findIndex(p => String(p.id) === String(addForm.value.user_plant_id));
            if (idx === -1) idx = 0;
            let newIdx = idx + offset;
            if (newIdx < 0) newIdx = list.length - 1;
            if (newIdx >= list.length) newIdx = 0;
            const newPlant = list[newIdx];
            addForm.value.user_plant_id = String(newPlant.id);
            // sync global selected plant so chart + thresholds refresh
            selectedUserPlantId.value = String(newPlant.id);
            render();
        }
        const goPrevPlant = () => goToPlant(-1);
        const goNextPlant = () => goToPlant(1);

        async function fetchPlants() {
            try {
                // Preload empty to warm endpoint (optional)
                species.value = await fetchSpecies();
                userPlants.value = await fetchUserPlants();
                if (!selectedUserPlantId.value && userPlants.value.length) {
                    selectedUserPlantId.value = String(userPlants.value[0].id);
                }
                // Load translations lazily
                speciesLocaleMap.value = await loadSpeciesTranslations(locale.value);
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

        async function refreshWeather() {
            const city = weather.value.city || 'Utrecht';
            const res = await getWaterSuggestion(city);
            if (res.status === 'success') {
                weather.value.location = res.location;
                weather.value.today = res.today;
                weather.value.next = res.next || [];
                weather.value.error = '';
            } else {
                weather.value.error = res.message || 'Failed to load weather';
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
            await refreshWeather();
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
            , tSpecies
            , locale
            , goPrevPlant
            , goNextPlant
            , currentPlantSuggestions
            , phSliderStyle
            , moistureSliderStyle
            , phInRange
            , moistureInRange
            , weather
            , refreshWeather
        };
    }
}).mount('#app');
