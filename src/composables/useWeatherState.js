import { ref } from 'vue';
import { getWaterSuggestion } from '../api/weather.js';

export function useWeatherState(defaultCity = 'Utrecht') {
    const weather = ref({ city: defaultCity, location: '', today: null, next: [], error: '' });

    async function refreshWeather() {
        const city = weather.value.city || defaultCity;
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

    return { weather, refreshWeather };
}
