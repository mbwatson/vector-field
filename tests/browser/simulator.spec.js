import { expect, test } from '@playwright/test';

const preferenceKey = 'vector-field.preferences.v1';

async function openSettings(page) {
	await expect(page.locator('#plane')).toBeVisible();
	const toggle = page.locator('#toggleDrawerBtn');
	if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
	await expect(page.locator('#controlDrawer')).toBeVisible();
}

test('initializes the canvas and core controls', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('#plane')).toBeVisible();
	await expect(page.locator('#playPause')).toContainText('Play');
	await page.locator('#playPause').click();
	await expect(page.locator('#playPause')).toContainText('Pause');
	await page.locator('#clearParticles').click();
	await page.locator('#respawnParticles').click();
});

test('stops rendering while paused and resumes for playback', async ({ page }) => {
	await page.addInitScript(() => {
		window.__backgroundBlits = 0;
		const drawImage = CanvasRenderingContext2D.prototype.drawImage;
		CanvasRenderingContext2D.prototype.drawImage = function(...args) {
			window.__backgroundBlits++;
			return drawImage.apply(this, args);
		};
	});
	await page.goto('/');
	await expect(page.locator('#playPause')).toContainText('Play');
	await page.waitForTimeout(1000);
	const settledCount = await page.evaluate(() => window.__backgroundBlits);
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => window.__backgroundBlits)).toBe(settledCount);

	await page.locator('#playPause').click();
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => window.__backgroundBlits)).toBeGreaterThan(settledCount);

	await page.locator('#playPause').click();
	await page.waitForTimeout(100);
	const pausedCount = await page.evaluate(() => window.__backgroundBlits);
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => window.__backgroundBlits)).toBe(pausedCount);
});

test('selects presets and accepts or rejects field edits', async ({ page }) => {
	await page.goto('/');
	await page.locator('#openPresetsBtn').click();
	await expect(page.locator('#presetDialog')).toBeVisible();
	const rotation = page.locator('[data-preset-id="counterclockwise-rotation"]');
	await rotation.click();
	await expect(page.locator('#presetDialog')).toBeHidden();
	await expect(rotation).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('#openPresetsBtn')).toBeFocused();
	await page.locator('#openPresetsBtn').click();
	await page.keyboard.press('Escape');
	await expect(page.locator('#presetDialog')).toBeHidden();
	await expect(page.locator('#openPresetsBtn')).toBeFocused();

	await page.locator('#partX').click();
	await expect(page.locator('#partX input')).toHaveValue('-y');
	await page.locator('#partX input').fill('x+y');
	await page.locator('#partX input').press('Enter');
	await expect(rotation).toHaveAttribute('aria-pressed', 'false');

	await page.locator('#partY').click();
	await page.locator('#partY input').fill('unknown');
	await page.locator('#partY input').press('Enter');
	await expect(page.locator('#fnError')).toHaveClass(/visible/);
	await page.locator('#partY input').press('Escape');
});

test('offers the curated preset catalog and applies complex fields', async ({ page }) => {
	await page.goto('/');
	await page.locator('#openPresetsBtn').click();
	await expect(page.locator('.vector-preset')).toHaveCount(24);
	await expect(page.locator('.preset-category h3')).toHaveText([
		'Fundamental Fields',
		'Linear Fields',
		'Nonlinear Fields',
		'Curiosities',
	]);
	await expect(page.locator('[data-preset-id="zero-field"] .vector-preset-name')).toHaveText('Zero Field');
	await expect(page.locator('[data-preset-id="constant-right"] .vector-preset-name')).toHaveText('Uniform Rightward Flow');
	await expect(page.locator('[data-preset-id="vertical-stretch"]')).toHaveAttribute('aria-label', 'Vertical Expansion: ⟨ 0, y ⟩');
	await expect(page.locator('[data-preset-id="clockwise-rotation"]')).toHaveAttribute('aria-label', 'Clockwise Rotation: ⟨ y, -x ⟩');
	await expect(page.locator('[data-preset-id="horizontal-shear"]')).toHaveAttribute('aria-label', 'Horizontal Shear: ⟨ y, 0 ⟩');
	await expect(page.locator('[data-preset-id="attracting-orbit"] .vector-preset-name')).toHaveText('Attracting Orbit');
	await expect(page.locator('[data-preset-id="cubic-cross"]')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByText('Tornado', { exact: true })).toHaveCount(0);
	await expect(page.getByText('Flower', { exact: true })).toHaveCount(0);
	const dialogHeaderTop = await page.locator('#presetDialog .help-dialog-header').evaluate(element => element.getBoundingClientRect().top);
	const dialogBody = page.locator('#presetDialogBody');
	await dialogBody.hover();
	await page.mouse.wheel(0, 600);
	await expect.poll(() => dialogBody.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
	await expect(page.locator('#presetDialog .help-dialog-header')).toHaveJSProperty('offsetTop', 0);
	expect(await page.locator('#presetDialog .help-dialog-header').evaluate(element => element.getBoundingClientRect().top)).toBe(dialogHeaderTop);
	await page.locator('[data-preset-id="gaussian-source"]').click();

	await page.locator('#partX').click();
	await expect(page.locator('#partX input')).toHaveValue('x*e^(-(x^2+y^2))');
	await page.locator('#partX input').press('Escape');
});

test('opens layer settings and help', async ({ page }) => {
	await page.goto('/');
	await openSettings(page);
	await expect(page.locator('#presetDropdown')).toHaveCount(0);
	for (const selector of ['#toggleParticles', '#toggleVectors', '#toggleAxes', '#toggleGrid']) {
		await page.locator(selector).click();
		await expect(page.locator(selector)).not.toHaveClass(/active/);
	}
	if (await page.locator('#closeDrawerBtn').isVisible()) await page.locator('#closeDrawerBtn').click();
	await page.locator('#openHelpBtn').click();
	await expect(page.locator('#helpDialog')).toBeVisible();
	await page.locator('#closeHelpBtn').click();
});

test('shared fields preserve preferences and legacy URL state is ignored', async ({ page }) => {
	await page.addInitScript(({ key }) => {
		localStorage.setItem(key, JSON.stringify({ theme: 'light', notation: 'basis', speed: 2.5, particleSize: 13, showGrid: true }));
	}, { key: preferenceKey });
	await page.goto('/?fx=-y&fy=x&speed=0&particleSize=2&grid=0&zoom=20&notation=component');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.locator('.function-panel')).toHaveAttribute('data-notation', 'basis');
	await expect(page.locator('[data-preset-id="counterclockwise-rotation"]')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('#speedSlider')).toHaveValue('2.5');
	await expect(page.locator('#particleSizeSlider')).toHaveValue('13');
	await expect(page.locator('#toggleGrid')).toHaveClass(/active/);
});

test('restores every existing preference-backed control after reload', async ({ page }) => {
	await page.goto('/');
	await openSettings(page);
	await page.locator('#speedSlider').fill('1.75');
	await page.locator('#vectorSpacingSlider').fill('0.75');
	await page.locator('#particleSizeSlider').fill('12');
	await page.locator('#particleSpacingSlider').fill('1.25');
	await page.locator('#particleSpacingSlider').dispatchEvent('change');
	await page.locator('#vectorColorControls [data-low-color="#2563eb"]').click();
	await page.locator('#vectorMagnitudeMode').selectOption('length');
	await page.locator('#particleUniformColorControl [data-color="#f97316"]').click();
	await page.locator('#particleColorMode').selectOption('magnitude');
	await page.locator('#notationSelect').selectOption('basis');
	for (const selector of ['#toggleParticles', '#toggleVectors', '#toggleAxes', '#toggleGrid', '#toggleInspector']) {
		await page.locator(selector).click();
	}

	await page.reload();
	await expect(page.locator('#speedSlider')).toHaveValue('1.75');
	await expect(page.locator('#vectorSpacingSlider')).toHaveValue('0.75');
	await expect(page.locator('#particleSizeSlider')).toHaveValue('12');
	await expect(page.locator('#particleSpacingSlider')).toHaveValue('1.25');
	await expect(page.locator('#vectorMagnitudeMode')).toHaveValue('length');
	await expect(page.locator('#vectorColorControls [data-low-color="#2563eb"]')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('#particleColorMode')).toHaveValue('magnitude');
	await page.locator('#particleColorMode').selectOption('uniform');
	await expect(page.locator('#particleUniformColorControl [data-color="#f97316"]')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('#notationSelect')).toHaveValue('basis');
	for (const selector of ['#toggleParticles', '#toggleVectors', '#toggleAxes', '#toggleGrid', '#toggleInspector']) {
		await expect(page.locator(selector)).toHaveAttribute('aria-pressed', 'false');
	}
});

test('inspects a field location without painting and stays inside the viewport', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'mobile', 'Touch inspection is intentionally deferred');
	await page.goto('/?fx=-y&fy=x');
	await page.locator('#clearParticles').click();
	const canvas = page.locator('#plane');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Canvas has no bounding box');
	const x = box.x + box.width * 0.625;
	const y = box.y + box.width * 0.05 + box.height / 2;
	await page.mouse.move(x, y);
	const inspector = page.locator('#fieldInspector');
	await expect(inspector).toBeVisible();
	await expect(inspector).toHaveText('(x, y) = (1.25, -0.50)\nF(x, y) = ⟨0.50, 1.25⟩\n|F| = 1.35');
	await expect(page.locator('#paintHud')).toHaveClass(/visible/);
	await page.locator('#notationSelect').selectOption('basis');
	await expect(inspector).toHaveText('(x, y) = (1.25, -0.50)\nF(x, y) = 0.50 i + 1.25 j\n|F| = 1.35');

	await canvas.dispatchEvent('pointermove', {
		pointerType: 'mouse',
		clientX: box.x + box.width - 2,
		clientY: box.y + box.height - 2,
	});
	await expect(inspector).toBeVisible();
	const tooltipBox = await inspector.boundingBox();
	if (!tooltipBox) throw new Error('Inspector has no bounding box');
	expect(tooltipBox.x).toBeGreaterThanOrEqual(box.x);
	expect(tooltipBox.y).toBeGreaterThanOrEqual(box.y);
	expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(box.x + box.width);
	expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(box.y + box.height);

	await page.goto('/?fx=1%2Fx&fy=1%2Fy');
	const singularBox = await page.locator('#plane').boundingBox();
	if (!singularBox) throw new Error('Canvas has no bounding box');
	await page.mouse.move(singularBox.x + singularBox.width / 2, singularBox.y + singularBox.height / 2);
	await expect(inspector).toHaveText('(x, y) = (0.00, 0.00)\nF(x, y) = undefined\n|F| = undefined');
});

test('suppresses inspection while painting, panning, editing, or disabled', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'mobile', 'Touch inspection is intentionally deferred');
	await page.goto('/');
	const canvas = page.locator('#plane');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Canvas has no bounding box');
	const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	const inspector = page.locator('#fieldInspector');
	await page.mouse.move(center.x, center.y);
	await expect(inspector).toBeVisible();

	await page.mouse.down();
	await expect(inspector).toBeHidden();
	await page.mouse.up();
	await expect(inspector).toBeVisible();
	await page.keyboard.down('Space');
	await page.mouse.down();
	await page.mouse.move(center.x + 20, center.y + 20);
	await expect(inspector).toBeHidden();
	await page.mouse.up();
	await page.keyboard.up('Space');

	await page.locator('#partX').click();
	await page.mouse.move(center.x, center.y);
	await expect(inspector).toBeHidden();
	await page.locator('#partX input').fill('unknown');
	await page.locator('#partX input').evaluate(input => input.blur());
	await expect(inspector).toBeVisible();

	await openSettings(page);
	await page.locator('#toggleInspector').click();
	await expect(page.locator('#toggleInspector')).toHaveAttribute('aria-pressed', 'false');
	await page.reload();
	await openSettings(page);
	await expect(page.locator('#toggleInspector')).toHaveAttribute('aria-pressed', 'false');
	await page.mouse.move(center.x, center.y);
	await expect(inspector).toBeHidden();
});

test('switches notation without changing the active field', async ({ page }) => {
	await page.goto('/?fx=x%2By&fy=x-y');
	await openSettings(page);
	await page.locator('#notationSelect').selectOption('basis');
	await expect(page.locator('.function-panel')).toHaveAttribute('data-notation', 'basis');
	await expect(page.locator('.fn-coordinate-x .notation-basis')).toBeVisible();
	await expect(page.locator('.notation-component').first()).toBeHidden();
	await expect(page.locator('#partX')).toHaveAttribute('aria-label', 'Edit i component');
	await expect(page.locator('#partY')).toHaveAttribute('aria-label', 'Edit j component');
	await expect(page.locator('[data-preset-id="counterclockwise-rotation"]')).toHaveAttribute('aria-label', 'Counterclockwise Rotation: -y i + x j');
	await expect(page.locator('#notationHelpExample')).toHaveText('F(x,y) = P(x,y)i + Q(x,y)j');
	if (await page.locator('#closeDrawerBtn').isVisible()) await page.locator('#closeDrawerBtn').click();

	await page.locator('#partX').click();
	await expect(page.locator('#partX input')).toHaveValue('x+y');
	await page.locator('#partX input').press('Escape');
	await expect(page.locator('#fnError')).not.toHaveClass(/visible/);

	await page.reload();
	await expect(page.locator('#notationSelect')).toHaveValue('basis');
	await expect(page.locator('.function-panel')).toHaveAttribute('data-notation', 'basis');
});

test('stacks long editable components at mobile widths', async ({ page }) => {
	const first = 'sin(x)+cos(y)+x^2+y^2+sqrt(abs(x*y))';
	const second = 'x^3-3*x*y^2+sin(x+y)+cos(x-y)';
	await page.goto(`/?fx=${encodeURIComponent(first)}&fy=${encodeURIComponent(second)}`);
	await expect(page.locator('#plane')).toBeVisible();
	const firstBox = await page.locator('.fn-coordinate-x').boundingBox();
	const secondBox = await page.locator('.fn-coordinate-y').boundingBox();
	if (!firstBox || !secondBox) throw new Error('Function components have no bounding box');
	await expect.poll(() => page.evaluate(() => window.innerWidth)).toBeGreaterThan(0);
	if ((await page.evaluate(() => window.innerWidth)) <= 520) {
		expect(secondBox.y).toBeGreaterThan(firstBox.y);
	}
	await page.locator('#partX').click();
	await expect(page.locator('#partX input')).toHaveValue(first);
	const editorBox = await page.locator('#partX').boundingBox();
	if (!editorBox) throw new Error('Function editor has no bounding box');
	const viewportWidth = await page.evaluate(() => window.innerWidth);
	expect(editorBox.x).toBeGreaterThanOrEqual(0);
	expect(editorBox.x + editorBox.width).toBeLessThanOrEqual(viewportWidth);
	await page.locator('#partX input').press('Escape');
});

test('switches vector encodings, palettes, and the relative-magnitude legend', async ({ page }) => {
	await page.goto('/?fx=1%2Fx&fy=1%2Fy');
	await openSettings(page);
	const legend = page.locator('#magnitudeLegend');
	await expect(legend).toBeVisible();
	await expect(legend).toHaveAttribute('data-mode', 'color');
	const blueRedPreset = page.locator('#vectorColorControls [data-low-color="#2563eb"]');
	await blueRedPreset.click();
	await expect(blueRedPreset).toHaveAttribute('aria-pressed', 'true');
	await expect(legend).toHaveCSS('--vector-low-color', '#2563eb');
	await expect(legend).toHaveCSS('--vector-high-color', '#ef4444');

	await page.locator('#vectorMagnitudeMode').selectOption('length');
	await expect(legend).toBeVisible();
	await expect(legend).toHaveAttribute('data-mode', 'length');
	await expect(page.locator('#vectorColorControls')).toBeHidden();

	await page.locator('#vectorMagnitudeMode').selectOption('uniform');
	await expect(legend).toBeHidden();
	await page.locator('#toggleVectors').click();
	await page.locator('#toggleVectors').click();
	await expect(legend).toBeHidden();

	await page.locator('#vectorMagnitudeMode').selectOption('color');
	await page.locator('#themeSelect').selectOption('light');
	await expect(blueRedPreset).toHaveAttribute('aria-pressed', 'true');
});

test('all vector encodings handle zero, constant, and singular fields', async ({ page }) => {
	const errors = [];
	page.on('pageerror', error => errors.push(error.message));
	for (const field of [
		{ fx: '0', fy: '0' },
		{ fx: '1', fy: '0' },
		{ fx: '1/x', fy: '1/y' },
	]) {
		await page.goto(`/?fx=${encodeURIComponent(field.fx)}&fy=${encodeURIComponent(field.fy)}`);
		await openSettings(page);
		for (const mode of ['color', 'length', 'uniform']) {
			await page.locator('#vectorMagnitudeMode').selectOption(mode);
			await expect(page.locator('#plane')).toBeVisible();
		}
	}
	expect(errors).toEqual([]);
});

test('switches particle color modes without advancing paused particles', async ({ page }) => {
	const errors = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('/?fx=x&fy=y');
	await openSettings(page);
	await expect(page.locator('#playPause')).toContainText('Play');
	await page.locator('#particleUniformColorControl [data-color="#f97316"]').click();
	await page.locator('#particleColorMode').selectOption('magnitude');
	await expect(page.locator('#particleUniformColorControl')).toBeHidden();
	await expect(page.locator('#useVectorParticleColors')).toHaveCount(0);
	const monochromePreset = page.locator('#vectorColorControls [data-low-color="#334155"]');
	await monochromePreset.click();
	await page.locator('#speedSlider').fill('4');
	await page.locator('#themeSelect').selectOption('light');
	await expect(monochromePreset).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('#playPause')).toContainText('Play');

	await page.reload();
	await openSettings(page);
	await expect(page.locator('#particleColorMode')).toHaveValue('magnitude');
	await expect(page.locator('#vectorColorControls [data-low-color="#334155"]')).toHaveAttribute('aria-pressed', 'true');
	await page.locator('#particleColorMode').selectOption('uniform');
	await expect(page.locator('#particleUniformColorControl [data-color="#f97316"]')).toHaveAttribute('aria-pressed', 'true');
	expect(errors).toEqual([]);
});

test('switches the DOM and canvas theme without resetting simulation state', async ({ page }) => {
	await page.goto('/?fx=-y&fy=x');
	await openSettings(page);
	await page.locator('#playPause').click();
	await page.locator('#clearParticles').click();
	await expect(page.locator('#paintHud')).toHaveClass(/visible/);
	await page.mouse.wheel(0, 100);
	const rangeBefore = await page.locator('#zoomHud').textContent();
	const darkBrightness = await page.locator('#plane').evaluate(canvas => {
		const pixels = canvas.getContext('2d').getImageData(0, 0, 10, 10).data;
		return Array.from(pixels).filter((_value, index) => index % 4 !== 3)
			.reduce((sum, value) => sum + value, 0) / (pixels.length * 0.75);
	});

	await page.locator('#themeSelect').selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.locator('#playPause')).toContainText('Pause');
	await expect(page.locator('#paintHud')).toHaveClass(/visible/);
	await expect(page.locator('[data-preset-id="counterclockwise-rotation"]')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('#zoomHud')).toHaveText(rangeBefore);
	await expect.poll(async () => page.locator('#plane').evaluate(canvas => {
		const pixels = canvas.getContext('2d').getImageData(0, 0, 10, 10).data;
		return Array.from(pixels).filter((_value, index) => index % 4 !== 3)
			.reduce((sum, value) => sum + value, 0) / (pixels.length * 0.75);
	})).toBeGreaterThan(darkBrightness + 100);

	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.locator('#themeSelect')).toHaveValue('light');
});

test('keyboard shortcuts mirror controls and ignore focused inputs', async ({ page }, testInfo) => {
	await page.goto('/');
	await page.keyboard.press('p');
	await expect(page.locator('#playPause')).toContainText('Pause');
	await page.keyboard.press('v');
	await page.keyboard.press('l');
	await page.keyboard.press('a');
	await expect(page.locator('#toggleVectors')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('#toggleGrid')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('#toggleAxes')).toHaveAttribute('aria-pressed', 'false');
	await page.keyboard.press('c');
	await expect(page.locator('#paintHud')).toHaveClass(/visible/);
	await page.keyboard.press('g');
	await expect(page.locator('#paintHud')).not.toHaveClass(/visible/);

	await openSettings(page);
	const openCanvasWidth = (await page.locator('#plane').boundingBox())?.width;
	await page.keyboard.press('s');
	await expect(page.locator('#toggleDrawerBtn')).toHaveAttribute('aria-expanded', 'false');
	if (testInfo.project.name === 'chromium') {
		await expect.poll(async () => (await page.locator('#plane').boundingBox())?.width).toBeGreaterThan(openCanvasWidth);
	}
	await page.keyboard.press('s');
	await expect(page.locator('#toggleDrawerBtn')).toHaveAttribute('aria-expanded', 'true');
	await page.keyboard.press('?');
	await expect(page.locator('#helpDialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('#helpDialog')).not.toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('#toggleDrawerBtn')).toHaveAttribute('aria-expanded', 'false');
	await page.keyboard.press('s');

	await page.locator('#speedSlider').focus();
	await page.keyboard.press('p');
	await expect(page.locator('#playPause')).toContainText('Pause');
});

test('share copies a field-only URL', async ({ page, context, browserName }) => {
	test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium-specific');
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/?fx=-y&fy=x&speed=3&grid=0');
	await page.locator('#shareLink').click();
	await expect(page.locator('#shareLink')).toHaveAttribute('aria-label', 'Share link copied');
	const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
	await expect([...copied.searchParams.keys()]).toEqual(['fx', 'fy']);
});

test('supports pointer painting, panning, and zooming without page errors', async ({ page }, testInfo) => {
	const errors = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('/');
	const canvas = page.locator('#plane');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Canvas has no bounding box');
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	await page.mouse.click(x, y);
	await page.mouse.move(x - 20, y - 20);
	await page.mouse.down();
	await page.mouse.move(x + 20, y + 20, { steps: 3 });
	await page.mouse.up();
	await page.mouse.move(x, y);
	await page.mouse.wheel(0, 100);
	if (testInfo.project.name === 'mobile') {
		await canvas.tap({ position: { x: box.width / 2, y: box.height / 2 } });
	}
	expect(errors).toEqual([]);
});

test('pinch zoom changes scale without painting', async ({ page, context }, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'Requires the touch-enabled mobile project');
	await page.goto('/');
	await page.locator('#clearParticles').click();
	await expect(page.locator('#paintHud')).toHaveClass(/visible/);
	const box = await page.locator('#plane').boundingBox();
	if (!box) throw new Error('Canvas has no bounding box');
	const centerX = box.x + box.width / 2;
	const centerY = box.y + box.height / 2;
	const client = await context.newCDPSession(page);
	await client.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [
			{ x: centerX - 40, y: centerY, id: 1 },
			{ x: centerX + 40, y: centerY, id: 2 },
		],
	});
	await client.send('Input.dispatchTouchEvent', {
		type: 'touchMove',
		touchPoints: [
			{ x: centerX - 50, y: centerY, id: 1 },
			{ x: centerX + 110, y: centerY, id: 2 },
		],
	});
	await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	const getRange = async () => {
		const text = await page.locator('#zoomHud').textContent();
		const match = text?.match(/Range: \[(-?[\d.]+), (-?[\d.]+)\]/);
		return match ? [Number(match[1]), Number(match[2])] : null;
	};
	await expect.poll(async () => {
		const range = await getRange();
		return range ? range[1] - range[0] : null;
	}).toBeCloseTo(5, 1);
	await expect.poll(async () => {
		const range = await getRange();
		return range ? (range[0] + range[1]) / 2 : null;
	}).toBeCloseTo(-150 / box.width, 1);
	await expect(page.locator('#paintHud')).toHaveClass(/visible/);
	await expect(page.locator('#fieldInspector')).toBeHidden();
});

test('drawer touches do not become ghost canvas touches', async ({ page, context }, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'Requires the touch-enabled mobile project');
	await page.goto('/');
	await page.locator('#clearParticles').click();
	await page.locator('#toggleDrawerBtn').tap();
	await page.locator('#vectorColorControls [data-low-color="#440154"]').tap();
	await page.locator('#closeDrawerBtn').tap();
	await expect(page.locator('#toggleDrawerBtn')).toHaveAttribute('aria-expanded', 'false');

	const initialRange = await page.locator('#zoomHud').textContent();
	const box = await page.locator('#plane').boundingBox();
	if (!box) throw new Error('Canvas has no bounding box');
	const client = await context.newCDPSession(page);
	const start = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
	await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
	await client.send('Input.dispatchTouchEvent', {
		type: 'touchMove',
		touchPoints: [{ x: start.x + 30, y: start.y + 30, id: 1 }],
	});
	await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

	await expect(page.locator('#zoomHud')).toHaveText(initialRange ?? '');
	await expect(page.locator('#paintHud')).not.toHaveClass(/visible/);
	await expect(page.locator('#fieldInspector')).toBeHidden();
});
