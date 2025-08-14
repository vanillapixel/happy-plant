// Readings API helpers
export async function fetchReadings(userPlantId) {
    try {
        const qs = userPlantId ? `?user_plant_id=${encodeURIComponent(userPlantId)}` : '';
        const res = await fetch(`./api/get-readings.php${qs}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching readings:', error);
        return [];
    }
}
