export function sortByDate(data) {
    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getThresholdLines(type) {
    if (type === 'ph') {
        return [
            { value: 6, color: 'red', label: '' },
            { value: 7, color: 'green', label: '' }
        ];
    } else if (type === 'moisture') {
        return [
            { value: 60, color: '#ffd13b', label: '' },
            { value: 75, color: '#9687eb', label: '' }
        ];
    }
    return [];
}

export function drawChart(type = 'ph', data = []) {
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
    const thresholds = getThresholdLines(type);

    const thresholdLinesPlugin = {
        id: 'thresholdLines',
        afterDraw(chart) {
            const yScale = chart.scales['y'];
            const ctx = chart.ctx;
            thresholds.forEach(({ value, color, label }) => {
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
