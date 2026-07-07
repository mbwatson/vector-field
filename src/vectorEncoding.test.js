import { describe, expect, it } from 'vitest';
import { magnitudeColorPosition, vectorEncoding } from './vectorEncoding.js';

describe('vectorEncoding', () => {
	it.each([0, NaN, Infinity])('skips undefined directions with magnitude %s', magnitude => {
		expect(vectorEncoding('color', magnitude, 10, 20)).toBeNull();
	});

	it('uses viewport-relative color normalization', () => {
		const encoding = vectorEncoding('color', 25, 100, 20);
		expect(encoding.length).toBe(20);
		expect(encoding.normalizedMagnitude).toBe(0.25);
		expect(encoding.colorPosition).toBe(0.5);
	});

	it('maps magnitude to a visible, capped length', () => {
		const weak = vectorEncoding('length', 0.001, 100, 20);
		const strong = vectorEncoding('length', 100, 100, 20);
		expect(weak.length).toBeGreaterThanOrEqual(4);
		expect(strong.length).toBe(20);
		expect(strong.arrowheadSize).toBeLessThanOrEqual(strong.length / 2);
	});

	it('keeps uniform mode independent of magnitude', () => {
		const weak = vectorEncoding('uniform', 1, 1000, 20);
		const strong = vectorEncoding('uniform', 1000, 1000, 20);
		expect(weak.length).toBe(strong.length);
		expect(weak.colorPosition).toBeNull();
	});

	it('caps extreme finite magnitudes', () => {
		const encoding = vectorEncoding('length', Number.MAX_VALUE, 10, 20);
		expect(encoding.normalizedMagnitude).toBe(1);
		expect(encoding.length).toBe(20);
	});
});

describe('magnitudeColorPosition', () => {
	it('uses the same square-root viewport normalization as vector colors', () => {
		expect(magnitudeColorPosition(25, 100)).toBe(0.5);
	});

	it.each([0, NaN, Infinity])('maps invalid or absent magnitude %s to the low color', magnitude => {
		expect(magnitudeColorPosition(magnitude, 100)).toBe(0);
	});

	it('caps large finite magnitudes at the high color', () => {
		expect(magnitudeColorPosition(Number.MAX_VALUE, 10)).toBe(1);
	});
});
