let plantsChartInstance = null;

async function getReadings() {
    try {
        const res = await fetch('./api/get-readings.php');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error fetching readings:', error);
        return [];
    }
}

function sortByDate(data) {
    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getThresholdLines(type) {
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

async function renderChart(type = 'ph') {
    const canvas = document.querySelector('#plants-chart');
    const ctx = canvas.getContext('2d');
    if (plantsChartInstance) {
        plantsChartInstance.destroy();
    }

    let data = await getReadings();
    if (!data || data.length === 0) {
        canvas.classList.add('no-data');
        return;
    }

    data = sortByDate(data);

    // Extract labels (dates) and values (ph or moisture)
    const labels = data.map(item => (new Date(item.date)).toLocaleString());
    const values = data.map(item => type === 'ph' ? item.ph : item.moisture);

    // Threshold lines
    const thresholds = getThresholdLines(type);

    // Plugin to draw horizontal lines
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

    plantsChartInstance = new Chart(ctx, {
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

document.getElementById('addReadingBtn').addEventListener('click', function () {
    document.body.classList.add('modal-open');
    const form = document.createElement('form');
    form.className = 'add-reading-form';
    form.id = 'addReadingForm';

    form.innerHTML = `
            <label for="plant">Select Plant:
                <select id="plant" required>
                    <option value="Basil">Basil</option>
                    <option value="Sage">Sage</option>
                    <option value="Cherry Tomatoes">Cherry Tomatoes</option>
                    <option value="Cat Grass">Cat Grass</option>
                    <option value="Mint">Mint</option>
                </select>
            </label>

            <label for="ph">pH Level:
                <input type="number" id="ph" step="0.1" min="0" max="14" required>
            </label>

            <label for="moisture">Moisture Level (%):
                <input type="number" id="moisture" step="1" min="0" max="100" required>
            </label>

            <button type="submit">Save Reading</button>
        `;
    const modalContent = document.querySelector('.modal .modal-content');
    modalContent.appendChild(form);
    form.addEventListener('submit', saveReading);
});

async function saveReading(e) {
    e.preventDefault();

    const plant = document.getElementById('plant').value;
    const ph = parseFloat(document.getElementById('ph').value);
    const moisture = parseInt(document.getElementById('moisture').value, 10);

    try {
        const res = await fetch('./api/save-reading.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plant, ph, moisture }),
        });

        const response = await res.json();

        if (response.status === 'success') {
            showNotification('Reading saved successfully!');
            await renderChart(document.querySelector('input[name="dataType"]:checked').value);
            e.target.reset();
            setTimeout(() => {
                notification.remove();
            }, 3000);
        } else {
            alert('Error: ' + response.message);
        }
    } catch (error) {
        alert('An error occurred: ' + error.message);
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    if (message.includes('Error')) {
        notification.style.backgroundColor = 'red';
    } else {
        notification.style.backgroundColor = 'green';
    }
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function closeModal() {
    const modalContent = document.querySelector('.modal-content');
    document.body.classList.remove('modal-open');
    modalContent.innerHTML = '';

}

const closeModalIcon = document.querySelector('.close-modal');
closeModalIcon && closeModalIcon.addEventListener('click', closeModal)

// Event listener for radio buttons
document.querySelectorAll('input[name="dataType"]').forEach(input => {
    input.addEventListener('change', () => {
        renderChart(input.value);
    });
});

// Initial render for default pH
document.addEventListener('DOMContentLoaded', () => {
    renderChart('ph');
});
