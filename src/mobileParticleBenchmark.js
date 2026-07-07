import { particleBenchmarkScenarios } from './particleBenchmarkScenarios.js';

function formatMilliseconds(value) {
	return `${value.toFixed(1)} ms`;
}

function renderSummary(results) {
	return results.map(result => {
		const total = result.summary.total;
		const interval = result.summary.frameInterval;
		return `<tr>
			<td>${result.scenario.name}</td>
			<td>${formatMilliseconds(total.median)} / ${formatMilliseconds(total.p95)}</td>
			<td>${formatMilliseconds(interval.p95)}</td>
		</tr>`;
	}).join('');
}

export function setupMobileParticleBenchmark(api) {
	const panel = document.createElement('section');
	panel.className = 'mobile-benchmark-panel';
	panel.setAttribute('aria-labelledby', 'mobileBenchmarkTitle');
	panel.innerHTML = `
		<h2 id="mobileBenchmarkTitle">Physical-device benchmark</h2>
		<p>Keep this tab visible and the device awake. A run can take 1–3 minutes.</p>
		<div class="mobile-benchmark-actions">
			<button type="button" data-action="run">Run benchmark</button>
			<button type="button" data-action="copy" hidden>Copy JSON</button>
		</div>
		<p class="mobile-benchmark-status" role="status">Ready</p>
		<div class="mobile-benchmark-results" hidden>
			<table>
				<thead><tr><th>Scenario</th><th>Work median / p95</th><th>Interval p95</th></tr></thead>
				<tbody></tbody>
			</table>
			<textarea aria-label="Benchmark JSON" readonly></textarea>
		</div>`;
	document.body.append(panel);

	const runButton = panel.querySelector('[data-action="run"]');
	const copyButton = panel.querySelector('[data-action="copy"]');
	const status = panel.querySelector('.mobile-benchmark-status');
	const resultsContainer = panel.querySelector('.mobile-benchmark-results');
	const resultsBody = panel.querySelector('tbody');
	const output = panel.querySelector('textarea');

	runButton.addEventListener('click', async () => {
		runButton.disabled = true;
		copyButton.hidden = true;
		resultsContainer.hidden = true;
		let visibilityChanged = false;
		const onVisibilityChange = () => { visibilityChanged = true; };
		document.addEventListener('visibilitychange', onVisibilityChange);
		let wakeLock = null;
		try {
			wakeLock = await navigator.wakeLock?.request('screen');
		} catch {
			// The benchmark remains usable when wake lock permission is unavailable.
		}

		try {
			const results = [];
			for (let index = 0; index < particleBenchmarkScenarios.length; index++) {
				const scenario = particleBenchmarkScenarios[index];
				status.textContent = `Running ${index + 1}/${particleBenchmarkScenarios.length}: ${scenario.name}`;
				api.configure(scenario);
				const result = await api.run({ warmupFrames: 60, sampleFrames: 180 });
				results.push({ scenario, ...result });
			}

			const report = {
				metadata: {
					date: new Date().toISOString(),
					device: new URLSearchParams(window.location.search).get('device') || 'unspecified',
					userAgent: navigator.userAgent,
					viewport: `${window.innerWidth}x${window.innerHeight}`,
					screen: `${screen.width}x${screen.height}`,
					devicePixelRatio: window.devicePixelRatio,
					hardwareConcurrency: navigator.hardwareConcurrency ?? null,
					deviceMemory: navigator.deviceMemory ?? null,
					visibilityChanged,
				},
				results,
			};
			resultsBody.innerHTML = renderSummary(results);
			output.value = JSON.stringify(report, null, 2);
			resultsContainer.hidden = false;
			copyButton.hidden = false;
			status.textContent = visibilityChanged
				? 'Finished, but the tab was hidden during the run. Please run it again.'
				: 'Finished. Copy the JSON and send it back to the benchmark operator.';
		} catch (error) {
			status.textContent = `Benchmark failed: ${error.message}`;
		} finally {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			await wakeLock?.release();
			runButton.disabled = false;
			runButton.textContent = 'Run again';
		}
	});

	copyButton.addEventListener('click', async () => {
		try {
			await navigator.clipboard.writeText(output.value);
			status.textContent = 'JSON copied.';
		} catch {
			output.focus();
			output.select();
			status.textContent = 'Select all and copy the highlighted JSON.';
		}
	});
}
