import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { particleBenchmarkScenarios as scenarios } from '../../src/particleBenchmarkScenarios.js';

const baseURL = 'http://127.0.0.1:4174';

async function waitForServer() {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			const response = await fetch(baseURL);
			if (response.ok) return;
		} catch {
			// Preview may still be starting.
		}
		await new Promise(resolve => setTimeout(resolve, 100));
	}
	throw new Error(`Timed out waiting for ${baseURL}`);
}

const vite = fileURLToPath(new URL('../../node_modules/.bin/vite', import.meta.url));
const preview = spawn(vite, ['preview', '--host', '127.0.0.1', '--port', '4174'], {
	stdio: ['ignore', 'inherit', 'inherit'],
});

let browser;
try {
	await waitForServer();
	browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
	await page.goto(`${baseURL}/?benchmark=1`);
	await page.waitForFunction(() => Boolean(window.__particleBenchmark));

	const results = [];
	for (const scenario of scenarios) {
		process.stderr.write(`Running ${scenario.name}...\n`);
		const result = await page.evaluate(async benchmarkScenario => {
			window.__particleBenchmark.configure(benchmarkScenario);
			return window.__particleBenchmark.run({ warmupFrames: 60, sampleFrames: 180 });
		}, scenario);
		results.push({ scenario, ...result });
	}

	console.log(JSON.stringify({
		metadata: {
			date: new Date().toISOString(),
			browserVersion: browser.version(),
			headless: true,
			viewport: '1280x720',
			deviceScaleFactor: 1,
			build: 'vite preview production build',
		},
		results,
	}, null, 2));
} finally {
	await browser?.close();
	preview.kill('SIGTERM');
	await Promise.race([
		once(preview, 'exit'),
		new Promise(resolve => setTimeout(resolve, 2000)),
	]);
	if (preview.exitCode === null) preview.kill('SIGKILL');
}
