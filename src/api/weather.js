// Weather API helper using Open-Meteo
// We do client-side calls to public endpoints. No API key required.

// This file fetches weather data from api.open-meteo.com.
// It geocodes the user's city, requests a 3-day forecast,
// and computes a watering suggestion for TODAY only based on today's
// temperature and precipitation. It also returns the next 2 days for display.
// The main functions are:
// - geocodeCity: gets latitude/longitude for a city name
// - fetchForecast: gets weather data for those coordinates (3 days)
// - computeWaterLevel: calculates watering level (1-3) for a given day index
// - getWaterSuggestion: combines all steps and returns today + next 2 days

async function geocodeCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    const r = data && Array.isArray(data.results) && data.results[0];
    if (!r) throw new Error('City not found');
    return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country };
}

async function fetchForecast(lat, lon) {
    // Request daily variables for the next 3 days including weathercode and precip probability
    const dailyParams = ['weathercode', 'temperature_2m_max', 'precipitation_sum', 'precipitation_probability_max'].join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${dailyParams}&timezone=auto&forecast_days=3`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Forecast fetch failed');
    const data = await res.json();
    return data?.daily || null;
}

// Compute a simple watering suggestion level 1..3 for a given day index (default: 0 = today)
// Heuristic:
// - Level 3 if temp_max >= 28C AND precip_sum < 1mm AND precip_prob < 30%
// - Level 2 if temp_max >= 22C AND precip_sum < 3mm AND precip_prob < 60%
// - Else Level 1
export function computeWaterLevel(daily, idx = 0) {
    if (!daily || !daily.time || daily.time.length === 0) return { level: 1, reason: 'No forecast' };
    const i = Math.max(0, Math.min(idx, daily.time.length - 1));
    const t = Number(daily.temperature_2m_max?.[i] ?? 0);
    const p = Number(daily.precipitation_sum?.[i] ?? 0);
    const prob = Number(daily.precipitation_probability_max?.[i] ?? 0);
    let level = 1;
    if (t >= 28 && p < 1 && prob < 30) level = 3;
    else if (t >= 22 && p < 3 && prob < 60) level = 2;
    const reason = `max ${t.toFixed(0)}°C, precip ${p.toFixed(1)}mm, chance ${prob.toFixed(0)}%`;
    return { level, reason };
}

function mapWeatherIcon(code) {
    // Minimal mapping from WMO weather codes to Font Awesome icons
    // 0: Clear sky -> sun
    // 1-3: Mainly clear/partly cloudy/overcast -> cloud-sun/cloud
    // 45-48: Fog -> smog
    // 51-67: Drizzle/rain -> cloud-showers-heavy
    // 71-77: Snow -> snowflake
    // 80-82: Rain showers -> cloud-showers-heavy
    // 95-99: Thunderstorm -> bolt
    if (code === 0) return 'fas fa-sun text-yellow-500';
    if (code >= 1 && code <= 3) return 'fas fa-cloud-sun text-amber-500';
    if (code === 45 || code === 48) return 'fas fa-smog text-slate-400';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'fas fa-cloud-showers-heavy text-sky-600';
    if (code >= 71 && code <= 77) return 'fas fa-snowflake text-sky-400';
    if (code >= 95) return 'fas fa-bolt text-yellow-400';
    return 'fas fa-cloud text-slate-400';
}

function buildEntries(daily) {
    const out = [];
    const n = Math.min(3, daily?.time?.length || 0);
    for (let i = 0; i < n; i++) {
        const date = daily.time[i];
        const tempMax = Number(daily.temperature_2m_max?.[i] ?? 0);
        const precipSum = Number(daily.precipitation_sum?.[i] ?? 0);
        const precipProb = Number(daily.precipitation_probability_max?.[i] ?? 0);
        const code = Number(daily.weathercode?.[i] ?? 3);
        out.push({ date, tempMax, precipSum, precipProb, weathercode: code, icon: mapWeatherIcon(code) });
    }
    return out;
}

export async function getWaterSuggestion(city) {
    try {
        const { lat, lon, name, country } = await geocodeCity(city);
        const daily = await fetchForecast(lat, lon);
        const entries = buildEntries(daily);
        if (!entries.length) throw new Error('No forecast');
        const today = entries[0];
        const { level, reason } = computeWaterLevel(daily, 0);
        const next = entries.slice(1, 3);
        return { status: 'success', location: `${name}, ${country}`, today: { ...today, level, reason }, next };
    } catch (e) {
        return { status: 'error', message: e.message };
    }
}
