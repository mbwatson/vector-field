function percentile(sortedValues, fraction) {
	if (sortedValues.length === 0) return 0;
	const index = Math.ceil(sortedValues.length * fraction) - 1;
	return sortedValues[Math.max(0, index)];
}

function summarizeValues(values) {
	const sorted = [...values].sort((a, b) => a - b);
	return {
		median: percentile(sorted, 0.5),
		p95: percentile(sorted, 0.95),
	};
}

export class ParticleBenchmark {
	constructor() {
		this.runState = null;
		this.previousFrameStart = null;
	}

	run({ warmupFrames = 120, sampleFrames = 300 } = {}) {
		if (this.runState) throw new Error('A particle benchmark is already running');
		if (!Number.isInteger(warmupFrames) || warmupFrames < 0) {
			throw new Error('warmupFrames must be a non-negative integer');
		}
		if (!Number.isInteger(sampleFrames) || sampleFrames < 1) {
			throw new Error('sampleFrames must be a positive integer');
		}

		this.previousFrameStart = null;
		return new Promise(resolve => {
			this.runState = { warmupFrames, sampleFrames, samples: [], resolve };
		});
	}

	record(sample) {
		if (!this.runState) return;
		const frameInterval = this.previousFrameStart === null
			? null
			: sample.frameStart - this.previousFrameStart;
		this.previousFrameStart = sample.frameStart;

		if (this.runState.warmupFrames > 0) {
			this.runState.warmupFrames--;
			return;
		}

		this.runState.samples.push({ ...sample, frameInterval });
		if (this.runState.samples.length < this.runState.sampleFrames) return;

		const { samples, resolve } = this.runState;
		this.runState = null;
		const phaseNames = Object.keys(samples[0]).filter(name => name !== 'frameStart');
		const summary = {};
		for (const phaseName of phaseNames) {
			const values = samples
				.map(frame => frame[phaseName])
				.filter(value => value !== null);
			summary[phaseName] = summarizeValues(values);
		}
		const frameIntervals = samples
			.map(frame => frame.frameInterval)
			.filter(value => value !== null);
		const percentOver = budget => frameIntervals.length === 0
			? 0
			: 100 * frameIntervals.filter(value => value > budget).length / frameIntervals.length;
		resolve({
			frameCount: samples.length,
			summary,
			overBudget: {
				'20ms': percentOver(20),
				'33.3ms': percentOver(33.3),
			},
		});
	}
}
