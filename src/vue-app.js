import { drawChart } from './chart.js';
import { fetchReadings } from './api/readings.js';
import { fetchSpecies, fetchUserPlants, createUserPlant, createSpeciesByName, searchSpecies, fetchThresholdsByUserPlant, deleteUserPlant } from './api/plants.js';
import { showNotification } from './notifications.js';
import { loadSpeciesTranslations, loadUiTranslations, tSpecies, t, setLocale, reloadAllTranslations } from './i18n/index.js';
import { plantSuggestions, getPlantSuggestions, computeSliderStyle } from './plant-suggestions.js';
import { getWaterSuggestion } from './api/weather.js';

const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

createApp({
    setup() {
        // expose translation function placeholder early
        window.__hp_t = t;
        const authed = ref(false);
        const authTitle = computed(() => (authed.value ? 'Sign out' : 'Sign in'));
        const showAuthModal = ref(false);
        const showAddModal = ref(false);
        const showQuickAddModal = ref(false);
        const authTab = ref('login');
        const showDeletePlantModal = ref(false);

        const loginForm = ref({ identifier: '', password: '' });
        const registerForm = ref({ email: '', username: '', password: '', city: '' });

        const species = ref([]); // from species DB
        const locale = ref('en');
        const uiMap = ref({});
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
        const forecastOpen = ref(false);
        const translationsReady = ref(false);

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
            const defined = addForm.value.ph != null;
            return computeSliderStyle(lo, hi, 3, 10, phInRange.value, defined);
        });
        const moistureSliderStyle = computed(() => {
            const lo = thresholds.value?.moisture_morning ?? 60;
            const hi = thresholds.value?.moisture_night ?? 75;
            const defined = addForm.value.moisture != null;
            return computeSliderStyle(lo, hi, 0, 100, moistureInRange.value, defined);
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
            showQuickAddModal.value = false;
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
            addForm.value.user_plant_id = selectedUserPlantId.value || (userPlants.value[0]?.id || '');
            showAddModal.value = true;
        }

        function openQuickAddModal() {
            showQuickAddModal.value = true;
        }

        function requestDeleteCurrentPlant() {
            if (!selectedUserPlantId.value) return;
            showDeletePlantModal.value = true;
        }

        async function confirmDeletePlant() {
            const id = selectedUserPlantId.value;
            if (!id) { showDeletePlantModal.value = false; return; }
            const res = await deleteUserPlant(id);
            if (res.status === 'success') {
                // Remove locally
                userPlants.value = userPlants.value.filter(p => String(p.id) !== String(id));
                if (userPlants.value.length) {
                    selectedUserPlantId.value = String(userPlants.value[0].id);
                    addForm.value.user_plant_id = selectedUserPlantId.value;
                } else {
                    selectedUserPlantId.value = '';
                    addForm.value.user_plant_id = '';
                    chartData.value = [];
                    thresholds.value = null;
                    if (window.plantsChartInstance) { try { window.plantsChartInstance.destroy(); } catch { } window.plantsChartInstance = null; }
                }
                notify(t('delete_plant') + ' OK');
            } else {
                notify('Error deleting');
            }
            showDeletePlantModal.value = false;
            render();
        }

        function cancelDeletePlant() { showDeletePlantModal.value = false; }

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
                    goNextPlant()
                    addForm.value.ph = null;
                    addForm.value.moisture = null;
                    addForm.value.fertility = null;
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
                // Normalize and validate current selection
                const ids = userPlants.value.map(p => String(p.id));
                let changed = false;
                if (!selectedUserPlantId.value || !ids.includes(String(selectedUserPlantId.value))) {
                    // pick first available or clear
                    selectedUserPlantId.value = ids[0] || '';
                    changed = true;
                }
                // Sync addForm selection
                if (!addForm.value.user_plant_id || !ids.includes(String(addForm.value.user_plant_id))) {
                    addForm.value.user_plant_id = selectedUserPlantId.value || '';
                    changed = true;
                }
                // Load translations lazily
                speciesLocaleMap.value = await loadSpeciesTranslations(locale.value);
                uiMap.value = await loadUiTranslations(locale.value);
                if (changed) {
                    // Re-render thresholds + chart for new selection
                    await render();
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
                    speciesError.value = t('species_suggestion_error');
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
                // Close quick add modal after successful creation
                showQuickAddModal.value = false;
            } else {
                notify('Error creating plant');
            }
        }

        // Live species suggestions when typing (supports localized substring search)
        let lastSpeciesQueryId = 0;
        watch(() => newPlantForm.value.species_name, async (val) => {
            speciesError.value = '';
            const q = (val || '').trim();
            if (q.length < 2) {
                speciesSuggestions.value = [];
                return;
            }
            const queryId = ++lastSpeciesQueryId;
            try {
                // 1. Start with backend search (likely English canonical names)
                const base = await searchSpecies(q);
                if (queryId !== lastSpeciesQueryId) return; // race guard
                const byName = new Map();
                base.forEach(s => byName.set(s.common_name.toLowerCase(), s));

                // 2. Localized enrichment: if current locale isn't English, search translated names
                if (locale.value !== 'en' && speciesLocaleMap.value) {
                    const qLower = q.toLowerCase();
                    const englishToLocal = speciesLocaleMap.value; // { EnglishName: LocalizedName }
                    // Collect english names whose localized OR english form includes query
                    const englishMatches = [];
                    for (const [eng, loc] of Object.entries(englishToLocal)) {
                        if (!eng) continue;
                        const locLower = (loc || '').toLowerCase();
                        const engLower = eng.toLowerCase();
                        if (locLower.includes(qLower) || engLower.includes(qLower)) {
                            if (!byName.has(engLower)) {
                                englishMatches.push(eng);
                            }
                        }
                    }
                    // Limit extra fetches to avoid overload
                    const limited = englishMatches.slice(0, 6);
                    if (limited.length) {
                        // Fetch each english name to get consistent shape (id, scientific_name, etc.)
                        const fetched = await Promise.all(limited.map(name => searchSpecies(name).catch(() => [])));
                        if (queryId !== lastSpeciesQueryId) return; // race guard after awaits
                        fetched.flat().forEach(item => {
                            const key = item.common_name?.toLowerCase();
                            if (key && !byName.has(key)) {
                                byName.set(key, item);
                            }
                        });
                    }
                }

                // 3. Update list preserving original backend order followed by localized additions
                const merged = [];
                base.forEach(s => merged.push(s));
                byName.forEach((s, k) => {
                    if (!base.find(b => b.common_name === s.common_name)) merged.push(s);
                });
                speciesSuggestions.value = merged;
            } catch {
                if (queryId === lastSpeciesQueryId) speciesSuggestions.value = [];
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

        function detectLocale() {
            const nav = navigator.language || navigator.userLanguage || 'en';
            const short = nav.split('-')[0].toLowerCase();
            return ['en', 'it'].includes(short) ? short : 'en';
        }

        async function changeLocale(newLoc) {
            locale.value = newLoc;
            setLocale(newLoc);
            speciesLocaleMap.value = await loadSpeciesTranslations(newLoc);
            uiMap.value = await loadUiTranslations(newLoc);
            // expose for non-vue modules (chart.js)
            window.__hp_t = t;
            translationsReady.value = true;
        }

        // Force reload translations without full page refresh (e.g. after editing ui.json during dev)
        async function reloadTranslations() {
            const current = locale.value || 'en';
            const { ui, species } = await reloadAllTranslations(current);
            uiMap.value = ui;
            speciesLocaleMap.value = species;
            // Ensure locale still set
            setLocale(current);
            window.__hp_t = t;
            translationsReady.value = true;
        }

        // React to user changing locale from select (ref is auto-unwrapped in template)
        watch(locale, (val, old) => {
            if (val && val !== old) {
                changeLocale(val);
            }
        });

        onMounted(async () => {
            const detected = detectLocale();
            await changeLocale(detected);
            await fetchMe();
            await fetchPlants();
            await render();
            await refreshWeather();
        });

        // Keep body scroll locked when any modal is open
        watch([showAuthModal, showAddModal, showQuickAddModal, showDeletePlantModal], ([a, b, c, d]) => {
            const open = !!(a || b || c || d);
            document.body.classList.toggle('modal-open', open);
        });

        return {
            authed,
            authTitle,
            showAuthModal,
            showAddModal,
            showQuickAddModal,
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
            openQuickAddModal,
            addForm,
            newPlantForm,
            addUserPlant,
            fetchPlants,
            saveReading,
            chartData,
            thresholds,
            tSpecies,
            locale,
            goPrevPlant,
            goNextPlant,
            currentPlantSuggestions,
            phSliderStyle,
            moistureSliderStyle,
            phInRange,
            moistureInRange,
            weather,
            refreshWeather,
            t,
            uiMap,
            changeLocale,
            forecastOpen,
            translationsReady
            , reloadTranslations
            , showDeletePlantModal
            , requestDeleteCurrentPlant
            , confirmDeletePlant
            , cancelDeletePlant
        };
    }
}).mount('#app');

// Expose root instance for console access (e.g., __hp_app.reloadTranslations())
try { window.__hp_app = Vue.__app__ || null; } catch { }
