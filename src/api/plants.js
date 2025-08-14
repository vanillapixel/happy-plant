// Plants & Species API helpers
export async function fetchSpecies() {
    const res = await fetch('./api/species_search.php?q=');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

export async function fetchUserPlants() {
    const res = await fetch('./api/user-plants.php');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

export async function createUserPlant(species_id, label) {
    const res = await fetch('./api/user-plants.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ species_id, label })
    });
    return res.ok ? await res.json() : { status: 'error' };
}

export async function deleteUserPlant(id) {
    const res = await fetch(`./api/user-plants.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok ? await res.json() : { status: 'error' };
}

export async function createSpeciesByName(name, opts = {}) {
    const res = await fetch('./api/create-species.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...opts })
    });
    return res.ok ? await res.json() : { status: 'error' };
}

export async function searchSpecies(q) {
    if (!q || q.length < 2) return [];
    const res = await fetch(`./api/species_search.php?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

export async function fetchThresholdsByUserPlant(userPlantId) {
    if (!userPlantId) return null;
    const res = await fetch(`./api/get-thresholds.php?user_plant_id=${encodeURIComponent(userPlantId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.status === 'success') return data.thresholds;
    return null;
}
