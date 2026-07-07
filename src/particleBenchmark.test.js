import { describe, expect, it } from 'vitest';
import { ParticleBenchmark } from './particleBenchmark.js';

describe('ParticleBenchmark', () => {
	it('discards warm-up frames and summarizes measured frames', async () => {
		const benchmark = new ParticleBenchmark();
		const resultPromise = benchmark.run({ warmupFrames: 1, sampleFrames: 3 });
		benchmark.record({ frameStart: 0, total: 99 });
		benchmark.record({ frameStart: 10, total: 1 });
		benchmark.record({ frameStart: 30, total: 3 });
		benchmark.record({ frameStart: 60, total: 2 });

		await expect(resultPromise).resolves.toEqual({
			frameCount: 3,
			summary: {
				total: { median: 2, p95: 3 },
				frameInterval: { median: 20, p95: 30 },
			},
				overBudget: {
					'20ms': 100 / 3,
					'33.3ms': 0,
				},
		});
	});
});
