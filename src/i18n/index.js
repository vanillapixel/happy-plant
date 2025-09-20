// Simple i18n loader for species names + UI strings
let speciesTranslations = null;
let uiTranslations = null;
let currentLocale = 'en';

export async function loadSpeciesTranslations(locale = 'en') {
    currentLocale = locale;
    if (!speciesTranslations) {
        try {
            const res = await fetch('./src/i18n/species.json');
            if (res.ok) speciesTranslations = await res.json();
        } catch { speciesTranslations = {}; }
    }
    return (speciesTranslations && speciesTranslations[locale]) || {};
}

export async function loadUiTranslations(locale = 'en') {
    currentLocale = locale;
    if (!uiTranslations) {
        try {
            const res = await fetch('./src/i18n/ui.json');
            if (res.ok) uiTranslations = await res.json();
        } catch { uiTranslations = {}; }
    }
    return (uiTranslations && uiTranslations[locale]) || {};
}

export function setLocale(locale) {
    currentLocale = locale;
}

export function tSpecies(commonName) {
    if (!speciesTranslations) return commonName;
    return (speciesTranslations[currentLocale] && speciesTranslations[currentLocale][commonName]) || commonName;
}

export function t(key) {
    if (!uiTranslations) return key;
    return (uiTranslations[currentLocale] && uiTranslations[currentLocale][key]) || key;
}

// Force reload helpers -------------------------------------------------
// Invalidate both translation caches (ui + species). Next load* call will refetch.
export function invalidateTranslations() {
    speciesTranslations = null;
    uiTranslations = null;
}

// Reload all translation maps for the given (or current) locale, bypassing cache.
export async function reloadAllTranslations(locale = currentLocale) {
    invalidateTranslations();
    // Re-run the loaders explicitly so callers can await fresh maps.
    const ui = await loadUiTranslations(locale);
    const species = await loadSpeciesTranslations(locale);
    return { ui, species };
}
