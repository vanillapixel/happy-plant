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
    const labels = sorted.map(item => (new Date(item.date)).toLocaleString());
    const values = sorted.map(item => (type === 'ph' ? item.ph : item.moisture));
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
                label: type === 'ph' ? 'pH Level' : 'Moisture Level (%)',
                data: values,
                fill: false,
                borderColor: '#47b8db',
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    suggestedMin: type === 'ph' ? 4 : 0,
                    suggestedMax: type === 'ph' ? 10 : 100
                },
                x: {
                    type: 'category',
                    ticks: {
                        maxRotation: 45,
                        minRotation: 30
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
