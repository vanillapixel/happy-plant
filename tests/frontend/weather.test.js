// Vitest unit tests for src/api/weather.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

// The module under test
import * as weather from '../../src/api/weather.js';

// Helpers to craft mock fetch responses
function mockFetchSequence(responses) {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(() => {
        const r = responses[call++];
        if (!r) throw new Error('Unexpected fetch call count: ' + call);
        if (r.error) return Promise.reject(r.error);
        return Promise.resolve({
            ok: true,
            json: async () => r.json,
        });
    });
}

describe('weather.getWaterSuggestion', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns suggestion for today and next 2 days', async () => {
        // Mock geocoding and forecast responses (two fetch calls)
        mockFetchSequence([
            {
                json: {
                    results: [
                        { name: 'Utrecht', latitude: 52.0907, longitude: 5.1214, country: 'Netherlands' }
                    ]
                }
            },
            {
                json: {
                    daily: {
                        time: ['2025-08-22', '2025-08-23', '2025-08-24'],
                        weathercode: [1, 61, 95],
                        temperature_2m_max: [22.5, 19.1, 24.2],
                        precipitation_sum: [0.0, 6.2, 18.4],
                        precipitation_probability_max: [10, 60, 90],
                    }
                }
            }
        ]);

        const res = await weather.getWaterSuggestion('Utrecht');
        expect(res.location).toContain('Utrecht');
        expect(res.today).toBeTruthy();
        expect(res.next).toHaveLength(2);
        // Basic shape and level range checks
        expect(res.today).toEqual(expect.objectContaining({
            date: expect.any(String),
            tempMax: expect.any(Number),
            precipSum: expect.any(Number),
            precipProb: expect.any(Number),
            level: expect.any(Number),
            reason: expect.any(String),
            icon: expect.any(String),
        }));
        expect(res.today.level).toBeGreaterThanOrEqual(0);
        expect(res.today.level).toBeLessThanOrEqual(3);
    });

    it('handles city not found', async () => {
        mockFetchSequence([
            { json: { results: [] } }
        ]);

        const res = await weather.getWaterSuggestion('NowhereVille');
        expect(res.status).toBe('error');
        expect(res.message).toMatch(/city not found/i);
    });

    it('propagates network errors', async () => {
        mockFetchSequence([
            { error: new Error('network down') }
        ]);

        const res = await weather.getWaterSuggestion('Utrecht');
        expect(res.status).toBe('error');
        expect(res.message).toMatch(/network down/i);
    });
});
