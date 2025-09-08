// Plant care suggestions (EN / IT) and slider style helper
// Exported for reuse and easier maintenance.

export const plantSuggestions = {
    'basil': { en: ['Keep soil evenly moist, not soggy', 'Pinch tops to encourage bushy growth', 'Avoid cold drafts'], it: ['Mantieni il terreno uniformemente umido, non fradicio', 'Pizzica le cime per favorire la crescita folta', 'Evita correnti fredde'] },
    'sage': { en: ['Let top soil dry before watering', 'Prefers good air circulation', 'Avoid over-fertilizing'], it: ['Lascia asciugare lo strato superiore prima di annaffiare', 'Preferisce buona circolazione d’aria', 'Evita troppi fertilizzanti'] },
    'cherry tomatoes': { en: ['Consistent moisture helps prevent splitting', 'Needs 6–8h direct sun', 'Feed lightly but regularly'], it: ['Umidità costante previene le spaccature', 'Necessita 6–8 ore di sole diretto', 'Concima leggermente ma regolarmente'] },
    'cat grass': { en: ['Keep evenly moist especially early', 'Trim to encourage fresh growth'], it: ['Mantieni umido soprattutto all’inizio', 'Taglia per stimolare nuova crescita'] },
    'mint': { en: ['Likes moist, rich soil', 'Can spread aggressively—contain roots'], it: ['Ama terreno umido e ricco', 'Può espandersi: contenere le radici'] },
    'thyme': { en: ['Allow soil to dry between waterings', 'Avoid soggy conditions'], it: ['Lascia asciugare il terreno tra un’annaffiatura e l’altra', 'Evita ristagni'] },
    'jasmine': { en: ['Enjoys bright light', 'Moderate watering—do not waterlog'], it: ['Ama luce intensa', 'Annaffiature moderate—non inzuppare'] },
    'aloe vera': { en: ['Allow soil to dry thoroughly', 'Use well-draining mix'], it: ['Lascia asciugare bene il terreno', 'Usa substrato ben drenante'] },
    'dipladenia': { en: ['Likes bright filtered light', 'Do not let roots sit in water'], it: ['Piace luce intensa filtrata', 'Non lasciare le radici in acqua'] },
    'asparagus fern': { en: ['Likes high humidity', 'Let topsoil dry slightly'], it: ['Gradisce alta umidità', 'Lascia asciugare leggermente la superficie'] },
    'geranium': { en: ['Allow partial drying between waterings', 'Deadhead spent blooms'], it: ['Lascia asciugare parzialmente tra annaffiature', 'Rimuovi i fiori secchi'] }
};

export function getPlantSuggestions(commonName, locale = 'en') {
    if (!commonName) return [];
    const key = commonName.toLowerCase();
    const entry = plantSuggestions[key];
    if (!entry) return [];
    return entry[locale] || entry.en || [];
}

export function computeSliderStyle(lo, hi, min, max, valueInRange) {
    const start = ((lo - min) / (max - min)) * 100;
    const end = ((hi - min) / (max - min)) * 100;
    return {
        background: `linear-gradient(90deg, #e7e7e7ff ${start}%, #1b4e51 ${start}%, #1b4e51 ${end}%, #e7e7e7ff ${end}%)`,
        '--thumb-color': valueInRange ? '#4a8560ff' : '#a86868ff'
    };
}    