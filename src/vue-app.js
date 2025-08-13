import { drawChart } from './chart.js';
import { fetchReadings } from './api/readings.js';
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

        const plants = ref([]);
        const selectedPlant = ref('');
        const dataType = ref('ph');

        const addForm = ref({ plant: '', ph: null, moisture: null });
        const chartData = ref([]);

        function notify(msg) { showNotification(msg); }

        async function fetchMe() {
            try {
                const r = await fetch('./api/me.php');
                const s = await r.json();
                authed.value = !!s.authenticated;
            } catch { }
        }

        function onAuthClick() {
            if (authed.value) {
                fetch('./api/logout.php').then(() => {
                    authed.value = false;
                    notify('Signed out');
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
            addForm.value.plant = selectedPlant.value || plants.value[0] || '';
            showAddModal.value = true;
        }

        async function saveReading() {
            try {
                const res = await fetch('./api/save-reading.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(addForm.value)
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
            const defaults = ['Basil', 'Sage', 'Cherry Tomatoes', 'Cat Grass', 'Mint', 'Thyme'];
            try {
                const res = await fetch('./api/get-plants.php');
                let list = [];
                if (res.ok) {
                    list = await res.json();
                }
                plants.value = Array.from(new Set([...defaults, ...list]));
                if (!selectedPlant.value && plants.value.length) {
                    selectedPlant.value = plants.value[0];
                }
            } catch { }
        }

        async function render() {
            // fetch data first and update reactive state
            const data = await fetchReadings(selectedPlant.value || undefined);
            chartData.value = data;
            // draw only if we have data, after DOM updates reveal the canvas
            await nextTick();
            if (chartData.value && chartData.value.length) {
                drawChart(dataType.value, chartData.value);
            } else {
                // no data: ensure any existing chart is destroyed
                if (window.plantsChartInstance) {
                    try { window.plantsChartInstance.destroy(); } catch { }
                    window.plantsChartInstance = null;
                }
            }
        }

        function onPlantChange() { render(); }
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
            plants,
            selectedPlant,
            dataType,
            onPlantChange,
            onTypeChange,
            openAddModal,
            addForm,
            saveReading,
            chartData
        };
    }
}).mount('#app');
