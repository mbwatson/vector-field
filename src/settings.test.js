import { describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_PREFERENCES,
	PREFERENCES_STORAGE_KEY,
	buildShareUrl,
	loadPreferences,
	readSharedField,
	savePreferences,
	validatePreferences,
} from './settings.js';

function memoryStorage(initialValue = null) {
	let value = initialValue;
	return {
		getItem: vi.fn(() => value),
		setItem: vi.fn((_key, nextValue) => { value = nextValue; }),
	};
}

describe('preferences', () => {
	it('uses immutable defaults for missing preferences', () => {
		expect(Object.isFrozen(DEFAULT_PREFERENCES)).toBe(true);
		expect(validatePreferences(null)).toEqual(DEFAULT_PREFERENCES);
	});

	it('defaults invalid properties independently', () => {
		const preferences = validatePreferences({
			theme: 'light',
			vectorMagnitudeMode: 'length',
			notation: 'basis',
			speed: 99,
			particleSize: 12,
			showGrid: 'yes',
			vectorLowColor: '#123abc',
			vectorHighColor: '#abcd',
			particleColorMode: 'velocity',
			particleColor: 'pink',
		});
		expect(preferences.theme).toBe('light');
		expect(preferences.vectorMagnitudeMode).toBe('length');
		expect(preferences.notation).toBe('basis');
		expect(preferences.speed).toBe(DEFAULT_PREFERENCES.speed);
		expect(preferences.particleSize).toBe(12);
		expect(preferences.showGrid).toBe(DEFAULT_PREFERENCES.showGrid);
		expect(preferences.vectorLowColor).toBe('#123abc');
		expect(preferences.vectorHighColor).toBe(DEFAULT_PREFERENCES.vectorHighColor);
		expect(preferences.particleColorMode).toBe(DEFAULT_PREFERENCES.particleColorMode);
		expect(preferences.particleColor).toBe(DEFAULT_PREFERENCES.particleColor);
	});

	it('loads and saves validated JSON under the versioned key', () => {
		const storage = memoryStorage(JSON.stringify({ speed: 2.5, showAxes: false }));
		const loaded = loadPreferences(storage);
		expect(loaded.speed).toBe(2.5);
		expect(loaded.showAxes).toBe(false);

		expect(savePreferences({ ...loaded, particleSize: 11 }, storage)).toBe(true);
		expect(storage.setItem).toHaveBeenCalledWith(PREFERENCES_STORAGE_KEY, expect.any(String));
		expect(loadPreferences(storage).particleSize).toBe(11);
	});

	it('falls back safely for malformed JSON or unavailable storage', () => {
		expect(loadPreferences(memoryStorage('{broken'))).toEqual(DEFAULT_PREFERENCES);
		const unavailable = { getItem: () => { throw new Error('denied'); } };
		expect(loadPreferences(unavailable)).toEqual(DEFAULT_PREFERENCES);
	});
});

describe('shared fields', () => {
	const fallback = { fx: '-y', fy: 'x' };

	it('reads valid coordinate functions and ignores legacy settings', () => {
		expect(readSharedField('?fx=x%2By&fy=x-y&speed=4&grid=0&zoom=12', fallback))
			.toEqual({ fx: 'x+y', fy: 'x-y' });
	});

	it('falls back unless both coordinate functions are valid', () => {
		expect(readSharedField('?fx=x', fallback)).toEqual(fallback);
		expect(readSharedField('?fx=x&fy=unknown', fallback)).toEqual(fallback);
	});

	it('generates a URL containing exactly fx and fy', () => {
		const result = new URL(buildShareUrl(
			'https://example.test/simulator/?speed=2&grid=0#section',
			{ fx: '-y', fy: 'x + y' },
		));
		expect([...result.searchParams.keys()]).toEqual(['fx', 'fy']);
		expect(result.searchParams.get('fx')).toBe('-y');
		expect(result.searchParams.get('fy')).toBe('x + y');
		expect(result.hash).toBe('');
	});
});
