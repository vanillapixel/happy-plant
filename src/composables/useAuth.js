import { ref, computed } from 'vue';

export function useAuth() {
    const authed = ref(false);
    const authTitle = computed(() => (authed.value ? 'Sign out' : 'Sign in'));
    const showAuthModal = ref(false);
    const authTab = ref('login');

    const loginForm = ref({ identifier: '', password: '' });
    const registerForm = ref({ email: '', username: '', password: '', city: '' });

    function notify(msg) {
        if (typeof window !== 'undefined' && window.showNotification) {
            try { window.showNotification(msg); } catch { }
        }
    }

    async function fetchMe(updateCityCb) {
        try {
            const r = await fetch('./api/auth.php');
            const s = await r.json();
            authed.value = !!s.authenticated;
            if (updateCityCb) updateCityCb(s.city || 'Utrecht');
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

    async function login(onAfterLogin) {
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
                if (onAfterLogin) await onAfterLogin(result);
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

    return {
        authed,
        authTitle,
        showAuthModal,
        authTab,
        loginForm,
        registerForm,
        fetchMe,
        onAuthClick,
        login,
        register,
    };
}
