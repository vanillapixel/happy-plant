// Minimal unit tests for computeWaterLevel
import assert from 'node:assert/strict';
import { computeWaterLevel } from '../src/api/weather.js';

function dailyFor(values) {
    // values: [{t, p, prob}] length 3
    const n = values.length;
    return {
        time: Array.from({ length: n }, (_, i) => `2025-08-${i + 1}`),
        temperature_2m_max: values.map(v => v.t),
        precipitation_sum: values.map(v => v.p),
        precipitation_probability_max: values.map(v => v.prob),
    };
}

// Happy path: hot and dry -> level 3
{
    const d = dailyFor([{ t: 30, p: 0.2, prob: 10 }, { t: 20, p: 2, prob: 40 }, { t: 21, p: 4, prob: 60 }]);
    const res = computeWaterLevel(d, 0);
    assert.equal(res.level, 3);
}

// Warm-ish and relatively dry -> level 2
{
    const d = dailyFor([{ t: 23, p: 1.5, prob: 40 }]);
    const res = computeWaterLevel(d, 0);
    assert.equal(res.level, 2);
}

// Otherwise -> level 1
{
    const d = dailyFor([{ t: 18, p: 5, prob: 70 }]);
    const res = computeWaterLevel(d, 0);
    assert.equal(res.level, 1);
}

// Bounds: index beyond length clamps to last entry
{
    const d = dailyFor([{ t: 29, p: 0.5, prob: 20 }]);
    const res = computeWaterLevel(d, 10);
    assert.equal(res.level, 3);
}

console.log('computeWaterLevel tests passed');
