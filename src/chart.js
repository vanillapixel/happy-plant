export function sortByDate(data) {
    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getThresholdLines(type, thresholds) {
    // thresholds can be null; fallback to generic values
    if (type === 'ph') {
        const lo = thresholds?.ph_min ?? 6;
        const hi = thresholds?.ph_max ?? 7;
        return [
            { value: lo, color: 'red', label: '' },
            { value: hi, color: 'green', label: '' }
        ];
    } else if (type === 'moisture') {
        const day = thresholds?.moisture_morning ?? 60;
        const night = thresholds?.moisture_night ?? 75;
        return [
            { value: day, color: '#ffd13b', label: '' },
            { value: night, color: '#9687eb', label: '' }
        ];
    } else if (type === 'fertility') {
        // No fixed thresholds yet; could add guidelines later
        return [];
    }
    return [];
}

export function drawChart(type = 'ph', data = [], thresholds = null) {
    // Destroy any existing chart first
    if (window.plantsChartInstance) {
        try { window.plantsChartInstance.destroy(); } catch { }
        window.plantsChartInstance = null;
    }

    if (!data || data.length === 0) {
        return; // Nothing to draw
    }

    // Ensure canvas exists (depends on Vue template v-if)
    const canvas = document.querySelector('#plants-chart');
    if (!canvas) {
        return; // Canvas not mounted yet; caller should retry after mount
    }
    const ctx = canvas.getContext('2d');

    const sorted = sortByDate([...data]);
    let filtered = sorted;
    if (type === 'fertility') {
        filtered = sorted.filter(item => item.fertility !== null && item.fertility !== undefined);
        if (!filtered.length) return; // nothing to plot
    }
    // Compact date labels: drop year, keep month/day and time (HH:MM)
    const labels = filtered.map(item => {
        const d = new Date(item.date);
        return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    });
    const values = filtered.map(item => (type === 'ph' ? item.ph : (type === 'moisture' ? item.moisture : item.fertility)));
    const thresholdsLines = getThresholdLines(type, thresholds);

    const thresholdLinesPlugin = {
        id: 'thresholdLines',
        afterDraw(chart) {
            const yScale = chart.scales['y'];
            const ctx = chart.ctx;
            thresholdsLines.forEach(({ value, color, label }) => {
                const y = yScale.getPixelForValue(value);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(chart.chartArea.left, y);
                ctx.lineTo(chart.chartArea.right, y);
                ctx.lineWidth = 2;
                ctx.strokeStyle = color;
                ctx.setLineDash([6, 6]);
                ctx.stroke();
                ctx.fillStyle = color;
                ctx.font = '12px Arial';
                ctx.fillText(label, chart.chartArea.right - 80, y - 5);
                ctx.restore();
            });
        }
    };

    window.plantsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: type === 'ph' ? 'pH Level' : (type === 'moisture' ? 'Moisture Level (%)' : (window.__hp_t ? window.__hp_t('fertility_dataset_label') : 'Fertility (Low/Nor/High)')),
                data: values,
                fill: false,
                borderColor: type === 'fertility' ? '#7c3aed' : '#47b8db',
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            scales: {
                y: type === 'fertility' ? {
                    beginAtZero: true,
                    min: -0.1,
                    max: 2.1,
                    ticks: {
                        stepSize: 1,
                        callback: (value) => ({ 0: 'Low', 1: 'Nor', 2: 'High' }[value] ?? value)
                    }
                } : {
                    beginAtZero: false,
                    suggestedMin: type === 'ph' ? 4 : 0,
                    suggestedMax: type === 'ph' ? 10 : 100
                },
                x: {
                    type: 'category',
                    ticks: {
                        maxRotation: 35,
                        minRotation: 0,
                        autoSkip: true,
                        font: { size: 10 }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            plugins: {
                legend: { display: true }
            }
        },
        plugins: [thresholdLinesPlugin]
    });
}
