import { describe, expect, it, vi } from 'vitest';
import { ParticleSystem } from './particleSystem.js';

describe('ParticleSystem drawing', () => {
	function createDrawingContext() {
		return {
			beginPath: vi.fn(),
			moveTo: vi.fn(),
			arc: vi.fn(),
			fill: vi.fn(),
		};
	}

	it('draws uniform particles in one native Canvas path', () => {
		const drawingContext = createDrawingContext();
		const p = {
			drawingContext,
			TWO_PI: Math.PI * 2,
			noStroke: vi.fn(),
			fill: vi.fn(),
		};
		const config = {
			particle: { mode: 'uniform', color: '#ff00ff', diameter: 8, spacing: 20 },
		};
		const plane = { xToPixel: x => x * 10, yToPixel: y => y * 10 };
		const system = new ParticleSystem(
			p,
			config,
			{ x: { max: 0 }, y: { max: 0 } },
			() => plane,
		);
		system.particles = [system.createParticle(1, 2), system.createParticle(3, 4)];

		system.draw({});

		expect(p.noStroke).toHaveBeenCalledOnce();
		expect(p.fill).toHaveBeenCalledOnce();
		expect(drawingContext.beginPath).toHaveBeenCalledOnce();
		expect(drawingContext.arc).toHaveBeenCalledTimes(2);
		expect(drawingContext.arc).toHaveBeenNthCalledWith(1, 10, 20, 0.5, 0, Math.PI * 2);
		expect(drawingContext.fill).toHaveBeenCalledOnce();
	});

	it('reports whether particle spawn animation is still active', () => {
		const drawingContext = createDrawingContext();
		const p = {
			drawingContext,
			TWO_PI: Math.PI * 2,
			noStroke: vi.fn(),
			fill: vi.fn(),
		};
		const config = {
			particle: { mode: 'uniform', color: '#ff00ff', diameter: 1, spacing: 20 },
		};
		const system = new ParticleSystem(
			p,
			config,
			{ x: { max: 0 }, y: { max: 0 } },
			() => ({ xToPixel: x => x, yToPixel: y => y }),
		);

		expect(system.hasSpawningParticles()).toBe(true);
		system.draw({});
		expect(system.hasSpawningParticles()).toBe(false);
	});

	it('batches magnitude particles by precomputed color and reuses field samples', () => {
		const drawingContext = createDrawingContext();
		const p = {
			drawingContext,
			TWO_PI: Math.PI * 2,
			noStroke: vi.fn(),
			fill: vi.fn(),
			lerpColor: vi.fn((_low, _high, amount) => amount),
		};
		const config = {
			plane: { velocity: 1 },
			particle: {
				mode: 'magnitude',
				lowColor: '#000000',
				highColor: '#ffffff',
				diameter: 8,
				spacing: 20,
			},
		};
		const plane = { xToPixel: x => x, yToPixel: y => y };
		const system = new ParticleSystem(
			p,
			config,
			{ x: { max: 0 }, y: { max: 0 } },
			() => plane,
		);
		system.particles = [system.createParticle(1, 0), system.createParticle(2, 0)];
		const force = {
			maxMag: 10,
			eval: vi.fn(particle => particle.x === 1 ? { x: 0, y: 0 } : { x: 10, y: 0 }),
		};

		system.draw(force);
		system.applyForce(force);

		expect(force.eval).toHaveBeenCalledTimes(2);
		expect(p.lerpColor).toHaveBeenCalledTimes(64);
		expect(p.fill).toHaveBeenNthCalledWith(1, 0);
		expect(p.fill).toHaveBeenNthCalledWith(2, 1);
		expect(drawingContext.fill).toHaveBeenCalledTimes(2);

		p.lerpColor.mockClear();
		system.draw(force);
		expect(p.lerpColor).not.toHaveBeenCalled();
	});
});
