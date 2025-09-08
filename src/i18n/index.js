// Simple i18n loader for species names
let speciesTranslations = null;
let currentLocale = 'en';

export async function loadSpeciesTranslations(locale = 'en') {
    currentLocale = locale;
    if (speciesTranslations) return speciesTranslations[locale] || {};
    try {
        const res = await fetch('./src/i18n/species.json');
        if (!res.ok) return {};
        speciesTranslations = await res.json();
        return speciesTranslations[locale] || {};
    } catch { return {}; }
}

export function tSpecies(commonName) {
    if (!speciesTranslations) return commonName;
    return (speciesTranslations[currentLocale] && speciesTranslations[currentLocale][commonName]) || commonName;
}
