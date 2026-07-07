import { describe, expect, it, vi } from 'vitest';
import { Particle } from './particle.js';

function createParticle(overrides = {}) {
	const config = {
		plane: { velocity: 1 },
		particle: {
			mode: 'magnitude',
			color: '#ff00ff',
			lowColor: '#000000',
			highColor: '#ffffff',
			diameter: 8,
		},
		...overrides,
	};
	return { config, particle: new Particle(config, 3, 4) };
}

describe('Particle field samples', () => {
	it('evaluates a newly placed paused particle for display without moving it', () => {
		const { particle } = createParticle();
		const force = { maxMag: 10, eval: vi.fn(() => ({ x: 3, y: 4 })) };

		const sample = particle.evaluateField(force);

		expect(force.eval).toHaveBeenCalledOnce();
		expect(sample.magnitude).toBe(5);
		expect(particle.x).toBe(3);
		expect(particle.y).toBe(4);
	});

	it('reuses the sample when speed changes and force is applied', () => {
		const { config, particle } = createParticle();
		const force = { maxMag: 10, eval: vi.fn(() => ({ x: 3, y: 4 })) };
		const firstSample = particle.evaluateField(force);

		config.plane.velocity = 4;
		expect(particle.evaluateField(force)).toBe(firstSample);
		particle.applyForce(force);
		expect(force.eval).toHaveBeenCalledOnce();
	});

	it('normalizes a singular field sample to zero magnitude', () => {
		const { particle } = createParticle();
		const sample = particle.evaluateField({ maxMag: 10, eval: () => ({ x: Infinity, y: NaN }) });
		expect(sample.magnitude).toBe(0);
	});
});
