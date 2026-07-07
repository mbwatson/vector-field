import { describe, expect, it } from 'vitest';
import { beginPinch, updatePinch } from './gestures.js';

function worldToPixel(point, panOffset, zoom, width, height) {
	const unit = width / (2 * zoom);
	return {
		x: width / 2 + (point.x - panOffset.x) * unit,
		y: height / 2 - (point.y - panOffset.y) * unit,
	};
}

describe('pinch gestures', () => {
	it('zooms around the world point under the moving midpoint', () => {
		const width = 400;
		const height = 800;
		const gesture = beginPinch({
			first: { x: 100, y: 300 },
			second: { x: 300, y: 500 },
			width,
			height,
			zoom: 5,
			panOffset: { x: 0, y: 0 },
		});
		const first = { x: 90, y: 320 };
		const second = { x: 390, y: 620 };
		const result = updatePinch(gesture, { first, second, width, height });
		const anchorPixel = worldToPixel(gesture.anchor, result.panOffset, result.zoom, width, height);

		expect(result.zoom).toBeCloseTo(10 / 3);
		expect(anchorPixel.x).toBeCloseTo((first.x + second.x) / 2);
		expect(anchorPixel.y).toBeCloseTo((first.y + second.y) / 2);
	});

	it('constrains zoom while retaining the midpoint anchor', () => {
		const width = 400;
		const height = 800;
		const gesture = beginPinch({
			first: { x: 190, y: 390 },
			second: { x: 210, y: 410 },
			width,
			height,
			zoom: 5,
			panOffset: { x: 2, y: -1 },
		});
		const result = updatePinch(gesture, {
			first: { x: 0, y: 200 },
			second: { x: 400, y: 600 },
			width,
			height,
		});

		expect(result.zoom).toBe(1);
		expect(result.panOffset).toEqual({ x: 2, y: -1 });
	});
});
