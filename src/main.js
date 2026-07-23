import '@fortawesome/fontawesome-free/css/brands.min.css';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import p5 from 'p5';
import { beginPinch, updatePinch } from './gestures.js';
import { setupMobileParticleBenchmark } from './mobileParticleBenchmark.js';
import { ParticleBenchmark } from './particleBenchmark.js';
import { ParticleSystem } from './particleSystem.js';
import { Plane } from './plane.js';
import {
	DEFAULT_PREFERENCES,
	buildShareUrl as createShareUrl,
	loadPreferences,
	readSharedField,
	savePreferences,
} from './settings.js';
import './styles.css';
import { getCanvasTheme } from './theme.js';
import { VectorField, VectorFunction } from './vectorField.js';

// Application and sketch state
let p;
let config;
let plane, system, viewport, f; // vector field
let bg; // cached offscreen layer for the static plane (grid, axes, vectors)
const appDefaults = {
	zoom: 5,
	centerX: 0,
	centerY: 0,
};
let preferences;
let canvasTheme;
let zoom = appDefaults.zoom;
let hovering = false;
let inspectorPointerType = null;
let inspectorPoint = null;
let inspectorFrame = null;
const queryParameters = new URLSearchParams(window.location.search);
const particleBenchmark = queryParameters.has('benchmark')
	? new ParticleBenchmark()
	: null;

// Viewport panning translation variables
let panOffset = { x: appDefaults.centerX, y: appDefaults.centerY };
let isPanning = false;
let startPanMouseX = 0;
let startPanMouseY = 0;
let startPanOffset = { x: 0, y: 0 };
let isSpacePressed = false;

// Mobile touch state. A single finger paints particles; two fingers pan and
// pinch-zoom around their midpoint.
let touchGesture = null;
let touchStartPoint = null;
let touchPaintMoved = false;
let touchGestureOccurred = false;
let pendingTouchPoints = null;
let touchGestureFrame = null;
const activeCanvasTouches = new Map();

// Toggles
let paused = true;
let showVectorField = DEFAULT_PREFERENCES.showVectors;
let showParticles = DEFAULT_PREFERENCES.showParticles;
let showGrid = DEFAULT_PREFERENCES.showGrid;
let showAxes = DEFAULT_PREFERENCES.showAxes;

// Page Elements
let functionEl, partXEl, partYEl, fnErrorEl;

// Raw source text of the currently active field's two components, kept so the
// heading can be edited in place.
let currentXExpr, currentYExpr, currentXLatex, currentYLatex;

// Controls
let playPauseButton;
let clearButton;
let respawnButton;
let shareButton;
let toggleParticlesButton;
let toggleVectorsButton;
let toggleAxesButton;
let toggleGridButton;
let toggleInspectorButton;
let planeCanvas;
let fieldInspectorEl;

// Presets keep stable IDs and human-readable metadata while VectorFunction
// remains the source of their compiled functions and display LaTeX.
const vectorPresets = [
	{ id: 'zero-field', name: 'Zero Field', category: 'Fundamental Fields', xExpr: '0', yExpr: '0' },
	{ id: 'constant-right', name: 'Uniform Rightward Flow', category: 'Fundamental Fields', xExpr: '1', yExpr: '0' },
	{ id: 'identity', name: 'Source', category: 'Fundamental Fields', xExpr: 'x', yExpr: 'y' },
	{ id: 'sink', name: 'Sink', category: 'Fundamental Fields', xExpr: '-x', yExpr: '-y' },
	{ id: 'horizontal-stretch', name: 'Horizontal Expansion', category: 'Fundamental Fields', xExpr: 'x', yExpr: '0' },
	{ id: 'vertical-stretch', name: 'Vertical Expansion', category: 'Fundamental Fields', xExpr: '0', yExpr: 'y' },

	{ id: 'clockwise-rotation', name: 'Clockwise Rotation', category: 'Linear Fields', xExpr: 'y', yExpr: '-x' },
	{ id: 'counterclockwise-rotation', name: 'Counterclockwise Rotation', category: 'Linear Fields', xExpr: '-y', yExpr: 'x' },
	{ id: 'weak-spiral-out', name: 'Spiral Out', category: 'Linear Fields', xExpr: 'x-y', yExpr: 'x+y' },
	{ id: 'weak-spiral-in', name: 'Spiral In', category: 'Linear Fields', xExpr: '-x-y', yExpr: 'x-y' },
	{ id: 'saddle', name: 'Saddle', category: 'Linear Fields', xExpr: 'x', yExpr: '-y' },
	{ id: 'horizontal-shear', name: 'Horizontal Shear', category: 'Linear Fields', xExpr: 'y', yExpr: '0' },

	{ id: 'mixed-quadratic', name: 'Quadratic Twist', category: 'Nonlinear Fields', xExpr: 'x*y', yExpr: 'x^2-y^2' },
	{ id: 'swirl', name: 'Swirl', category: 'Nonlinear Fields', xExpr: '-y', yExpr: 'x+x^2' },
	{ id: 'four-way-saddle', name: 'Four-Way Saddle', category: 'Nonlinear Fields', xExpr: 'x^2-y^2', yExpr: '2*x*y' },
	{ id: 'parabolic-flow', name: 'Parabolic Flow', category: 'Nonlinear Fields', xExpr: 'y', yExpr: 'x^2' },
	{ id: 'gaussian-source', name: 'Localized Source', category: 'Nonlinear Fields', xExpr: 'x*e^(-(x^2+y^2))', yExpr: 'y*e^(-(x^2+y^2))' },
	{ id: 'attracting-orbit', name: 'Attracting Orbit', category: 'Nonlinear Fields', xExpr: 'x*(1-x^2-y^2)-y', yExpr: 'y*(1-x^2-y^2)+x' },
	{ id: 'source-lattice', name: 'Source Lattice', category: 'Nonlinear Fields', xExpr: 'sin(x)', yExpr: 'sin(y)' },
	{ id: 'sin-cos-waves', name: 'Wave Cells', category: 'Nonlinear Fields', xExpr: 'sin(y)', yExpr: 'cos(x)' },

	{ id: 'whirlpool', name: 'Whirlpool', category: 'Curiosities', xExpr: '-y/(1+x^2+y^2)', yExpr: 'x/(1+x^2+y^2)' },
	{ id: 'pinwheel', name: 'Pinwheel', category: 'Curiosities', xExpr: 'sin(y)-x', yExpr: 'sin(x)+y' },
	{ id: 'ripple', name: 'Ripple', category: 'Curiosities', xExpr: 'sin(x*y)', yExpr: 'cos(x-y)' },
	{ id: 'cubic-cross', name: 'Cubic Cross', category: 'Curiosities', xExpr: 'y^3 - 9y', yExpr: 'x^3 - 9x' },
].map(preset => ({
	...preset,
	field: new VectorFunction(preset.xExpr, preset.yExpr),
}));
const DEFAULT_PRESET_ID = 'cubic-cross';

function persistPreferences() {
	preferences = {
		...preferences,
		speed: config.plane.velocity,
		vectorSpacing: config.vector.spacing,
		particleSize: config.particle.diameter,
		particleSpacing: config.particle.spacing,
		showParticles,
		showVectors: showVectorField,
		showAxes,
		showGrid,
	};
	savePreferences(preferences);
}

function applyTheme(theme) {
	canvasTheme = getCanvasTheme(theme);
	document.documentElement.dataset.theme = theme;
	config.plane.grid.color = p.color(...canvasTheme.grid);
	config.plane.grid.axis.color = p.color(...canvasTheme.axis);
	config.plane.grid.axis.labelColor = p.color(...canvasTheme.axisLabel);
	config.vector.color = p.color(...canvasTheme.vector);
	plane = new Plane(p, config, viewport, panOffset, () => f);
	redrawBackground();
	preferences = { ...preferences, theme };
	savePreferences(preferences);
}

function syncParticleAppearance() {
	config.particle.mode = preferences.particleColorMode;
	config.particle.color = p.color(preferences.particleColor);
	config.particle.lowColor = p.color(preferences.vectorLowColor);
	config.particle.highColor = p.color(preferences.vectorHighColor);
}

function applyParticleAppearance(updates) {
	preferences = { ...preferences, ...updates };
	syncParticleAppearance();
	savePreferences(preferences);
}

function updateMagnitudeLegend() {
	const legend = document.getElementById('magnitudeLegend');
	if (!legend) return;
	legend.hidden = !showVectorField || preferences.vectorMagnitudeMode === 'uniform';
	legend.dataset.mode = preferences.vectorMagnitudeMode;
	legend.style.setProperty('--vector-low-color', preferences.vectorLowColor);
	legend.style.setProperty('--vector-high-color', preferences.vectorHighColor);
}

function applyVectorAppearance(updates) {
	preferences = { ...preferences, ...updates };
	config.vector.mode = preferences.vectorMagnitudeMode;
	config.vector.lowColor = p.color(preferences.vectorLowColor);
	config.vector.highColor = p.color(preferences.vectorHighColor);
	syncParticleAppearance();
	plane = new Plane(p, config, viewport, panOffset, () => f);
	redrawBackground();
	updateMagnitudeLegend();
	savePreferences(preferences);
}

function setup() {
	preferences = loadPreferences();
	document.documentElement.dataset.theme = preferences.theme;
	canvasTheme = getCanvasTheme(preferences.theme);
	const defaultField = vectorPresets.find(preset => preset.id === DEFAULT_PRESET_ID).field;
	const fallback = { fx: defaultField.xExpr, fy: defaultField.yExpr };
	const sharedField = readSharedField(window.location.search, fallback);
	const initialVectorFunction = new VectorFunction(sharedField.fx, sharedField.fy);
	zoom = appDefaults.zoom;
	panOffset = { x: appDefaults.centerX, y: appDefaults.centerY };
	showParticles = preferences.showParticles;
	showVectorField = preferences.showVectors;
	showAxes = preferences.showAxes;
	showGrid = preferences.showGrid;

	config = {
		'plane': {
			'grid': {
				'color': p.color(...canvasTheme.grid),
				'weight': 1,
				'axis': {
					'tickmarkSize': 8,
					'color': p.color(...canvasTheme.axis),
					'labelColor': p.color(...canvasTheme.axisLabel),
					'weight': 2,
				}
			},
			'velocity': preferences.speed,
			'deltaVelocity': 0.1
		},
		'vector': {
			'spacing': preferences.vectorSpacing,
			'mode': preferences.vectorMagnitudeMode,
			'color': p.color(...canvasTheme.vector),
			'lowColor': p.color(preferences.vectorLowColor),
			'highColor': p.color(preferences.vectorHighColor),
			'weight': 1.5,
		},
		'particle': {
			'spacing': preferences.particleSpacing,
			'diameter': preferences.particleSize,
			'mode': preferences.particleColorMode,
			'color': p.color(preferences.particleColor),
			'lowColor': p.color(preferences.vectorLowColor),
			'highColor': p.color(preferences.vectorHighColor),
		},
	};

	viewport = {
		'x': { 'min': -zoom, 'max': zoom },
		'y': { 'min': -zoom, 'max': zoom }
	};

	let size = computeCanvasSize();
	p.createCanvas(size.w, size.h).id('plane').parent(document.querySelector('#canvasContainer'));
	
	updateViewport();
	updateExtentHUD();

	plane = new Plane(p, config, viewport, panOffset, () => f);
	system = new ParticleSystem(p, config, viewport, () => plane);
	f = new VectorField(p, config, viewport, defaultField.eval);
	bg = p.createGraphics(p.width, p.height);
	bg.pixelDensity(1);
	redrawBackground();
	setupUI(initialVectorFunction);
	if (particleBenchmark) {
		window.__particleBenchmark = {
			configure: configureParticleBenchmark,
			run: async options => {
				const result = await particleBenchmark.run(options);
				return { ...result, particleCount: system.particles.length };
			},
		};
		if (queryParameters.get('benchmark') === 'mobile') {
			setupMobileParticleBenchmark(window.__particleBenchmark);
		}
	}
}

function updateViewport() {
	viewport.x.min = panOffset.x - zoom;
	viewport.x.max = panOffset.x + zoom;
	// Calculate Y viewport bounds to maintain uniform scale (isotropic mapping)
	const unit = p.width / (viewport.x.max - viewport.x.min);
	const yRange = (p.height / 2) / unit;
	viewport.y.min = panOffset.y - yRange;
	viewport.y.max = panOffset.y + yRange;
}

// Re-renders the static plane (grid, axes, vectors) into the offscreen buffer.
// Called only when the field or a toggle changes, not every frame.
function redrawBackground() {
	bg.resetMatrix();
	bg.background(...canvasTheme.background);
	if (showGrid) {
		plane.drawGrid(bg);
	}
	if (showAxes) {
		plane.drawAxes(bg);
	}
	if (showVectorField) {
		plane.drawVectorField(bg);
	}
	requestRender();
}

function requestRender() {
	if (!p.isLooping()) p.redraw();
}

function requestInspectorRender() {
	if (p.isLooping() || inspectorFrame !== null) return;
	inspectorFrame = requestAnimationFrame(() => {
		inspectorFrame = null;
		requestRender();
	});
}

function requestParticleRender() {
	if (!paused || (showParticles && system.hasSpawningParticles())) {
		p.loop();
	} else {
		requestRender();
	}
}

function addParticle(x, y) {
	system.addParticle(x, y);
	requestParticleRender();
}

function draw() {
	const frameStart = particleBenchmark ? performance.now() : 0;
	// Blit the cached static layer, then draw only the animated particles.
	p.image(bg, 0, 0);
	const backgroundEnd = particleBenchmark ? performance.now() : 0;
	if (showParticles) {
		system.draw(f);
	}
	const particleRenderEnd = particleBenchmark ? performance.now() : 0;
	let cullingEnd = particleRenderEnd;
	let integrationEnd = particleRenderEnd;
	if (!paused) {
		system.update();
		cullingEnd = particleBenchmark ? performance.now() : 0;
		system.applyForce(f);
		integrationEnd = particleBenchmark ? performance.now() : 0;
	}
	drawFieldInspector();

	// Update paint HUD overlay visibility
	const paintHud = document.getElementById('paintHud');
	if (paintHud) {
		if (showParticles && system.particles.length === 0) {
			paintHud.classList.add('visible');
		} else {
			paintHud.classList.remove('visible');
		}
	}
	if (particleBenchmark) recordBenchmarkFrame({
		frameStart,
		backgroundEnd,
		particleRenderEnd,
		cullingEnd,
		integrationEnd,
	});
	if (!particleBenchmark && paused && (!showParticles || !system.hasSpawningParticles())) {
		p.noLoop();
	}
}

function inspectorIsActive() {
	return preferences.showInspector && hovering && inspectorPointerType !== 'touch' &&
		!isPanning && !p.mouseIsPressed && activeCanvasTouches.size === 0 &&
		!document.querySelector('.fn-edit');
}

function formatInspectorNumber(value) {
	if (!Number.isFinite(value)) return 'undefined';
	const rounded = Math.abs(value) < 0.005 ? 0 : value;
	return rounded.toFixed(2);
}

function inspectorVectorLabel(x, y) {
	if (!Number.isFinite(x) || !Number.isFinite(y)) return 'F(x, y) = undefined';
	const xLabel = formatInspectorNumber(x);
	const yLabel = formatInspectorNumber(y);
	if (preferences.notation === 'basis') {
		const sign = y < 0 ? '−' : '+';
		return `F(x, y) = ${xLabel} i ${sign} ${formatInspectorNumber(Math.abs(y))} j`;
	}
	return `F(x, y) = ⟨${xLabel}, ${yLabel}⟩`;
}

function positionInspectorTooltip() {
	const padding = 8;
	const gap = 14;
	const width = fieldInspectorEl.offsetWidth;
	const height = fieldInspectorEl.offsetHeight;
	const preferredLeft = inspectorPoint.x + gap;
	const preferredTop = inspectorPoint.y + gap;
	const left = preferredLeft + width <= p.width - padding
		? preferredLeft
		: inspectorPoint.x - width - gap;
	const top = preferredTop + height <= p.height - padding
		? preferredTop
		: inspectorPoint.y - height - gap;
	fieldInspectorEl.style.left = `${Math.max(padding, Math.min(left, p.width - width - padding))}px`;
	fieldInspectorEl.style.top = `${Math.max(padding, Math.min(top, p.height - height - padding))}px`;
}

function drawInspectorVector(x, y, vectorX, vectorY, magnitude) {
	const color = canvasTheme.hover;
	p.push();
	p.stroke(...color);
	p.strokeWeight(2);
	p.fill(...canvasTheme.background);
	p.circle(x, y, 9);
	if (Number.isFinite(magnitude) && magnitude > 0) {
		const relativeMagnitude = Math.min(magnitude / f.maxMag, 1);
		const length = 18 + 24 * relativeMagnitude;
		const endX = x + vectorX / magnitude * length;
		const endY = y - vectorY / magnitude * length;
		p.line(x, y, endX, endY);
		const angle = Math.atan2(endY - y, endX - x);
		const arrowSize = 6;
		p.line(endX, endY, endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
		p.line(endX, endY, endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
	}
	p.pop();
}

function drawFieldInspector() {
	if (!fieldInspectorEl || !inspectorIsActive()) {
		if (fieldInspectorEl) fieldInspectorEl.hidden = true;
		return;
	}
	const x = plane.pixelToX(inspectorPoint.x);
	const y = plane.pixelToY(inspectorPoint.y);
	// Keep evaluation in draw so pointer events can request frames freely without
	// evaluating an expensive field more than once in any rendered frame.
	const vector = f.eval({ x, y });
	const magnitude = Math.hypot(vector.x, vector.y);
	drawInspectorVector(inspectorPoint.x, inspectorPoint.y, vector.x, vector.y, magnitude);
	fieldInspectorEl.textContent = [
		`(x, y) = (${formatInspectorNumber(x)}, ${formatInspectorNumber(y)})`,
		inspectorVectorLabel(vector.x, vector.y),
		`|F| = ${formatInspectorNumber(magnitude)}`,
	].join('\n');
	fieldInspectorEl.hidden = false;
	positionInspectorTooltip();
}

function recordBenchmarkFrame({ frameStart, backgroundEnd, particleRenderEnd, cullingEnd, integrationEnd }) {
	const frameEnd = performance.now();
	particleBenchmark.record({
		frameStart,
		background: backgroundEnd - frameStart,
		particleRendering: particleRenderEnd - backgroundEnd,
		culling: cullingEnd - particleRenderEnd,
		integration: integrationEnd - cullingEnd,
		other: frameEnd - integrationEnd,
		total: frameEnd - frameStart,
	});
}

function configureParticleBenchmark({ particleCount, paused: shouldPause, colorMode, field }) {
	if (!Number.isInteger(particleCount) || particleCount < 1 || particleCount > 10000) {
		throw new Error('particleCount must be an integer from 1 to 10000');
	}
	if (!['uniform', 'magnitude'].includes(colorMode)) {
		throw new Error('colorMode must be uniform or magnitude');
	}
	if (!Array.isArray(field) || field.length !== 2) {
		throw new Error('field must contain x and y component expressions');
	}

	paused = Boolean(shouldPause);
	config.particle.mode = colorMode;
	applyVectorFunction(new VectorFunction(field[0], field[1]));

	const xRange = viewport.x.max - viewport.x.min;
	const yRange = viewport.y.max - viewport.y.min;
	const columns = Math.ceil(Math.sqrt(particleCount * xRange / yRange));
	const rows = Math.ceil(particleCount / columns);
	const particles = [];
	for (let index = 0; index < particleCount; index++) {
		const column = index % columns;
		const row = Math.floor(index / columns);
		const x = viewport.x.min + xRange * (0.1 + 0.8 * (column + 0.5) / columns);
		const y = viewport.y.min + yRange * (0.1 + 0.8 * (row + 0.5) / rows);
		const particle = system.createParticle(x, y);
		particle.diameter = config.particle.diameter;
		particle.new = false;
		particles.push(particle);
	}
	system.particles = particles;
	return { particleCount: particles.length, paused, colorMode, field };
}

// Responsive canvas sizing
function computeCanvasSize() {
	const viewportArea = document.querySelector('.viewport-area');
	return {
		w: viewportArea && viewportArea.clientWidth ? viewportArea.clientWidth : p.windowWidth,
		h: viewportArea && viewportArea.clientHeight ? viewportArea.clientHeight : p.windowHeight,
	};
}

function windowResized() {
	const size = computeCanvasSize();
	p.resizeCanvas(size.w, size.h);
	
	// Recreate offscreen buffer
	bg.remove();
	bg = p.createGraphics(size.w, size.h);
	bg.pixelDensity(1);
	
	// Rebuild configurations and viewport
	updateViewport();
	plane = new Plane(p, config, viewport, panOffset, () => f);
	redrawBackground();
	showExtentHUD();
}

function mouseXCoordinate() {
	return plane.pixelToX(p.mouseX);
}

function mouseYCoordinate() {
	return plane.pixelToY(p.mouseY);
}

function isMouseInCanvas() {
	// Don't spawn particles if clicking UI elements (like floating settings or header)
	if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return false;
	
	// Check if cursor is over the control drawer or math header on mobile overlays
	const activeEl = document.activeElement;
	if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
		return false;
	}
	return true;
}

function mousePressed() {
	if (hovering) requestRender();
	if (hovering && (p.mouseButton.center || p.mouseButton.right || isSpacePressed || p.keyIsDown(32))) {
		isPanning = true;
		startPanMouseX = p.mouseX;
		startPanMouseY = p.mouseY;
		startPanOffset = { x: panOffset.x, y: panOffset.y };
		// Prevent context menu on right click
		if (p.mouseButton.right) {
			const canvas = document.getElementById('plane');
			if (canvas) {
				const preventDefault = (e) => e.preventDefault();
				canvas.addEventListener('contextmenu', preventDefault, { once: true });
			}
		}
	}
}

function mouseReleased() {
	isPanning = false;
	if (hovering) requestRender();
}

function mouseClicked() {
	if (isMouseInCanvas() && hovering && !isPanning) {
		addParticle(mouseXCoordinate(), mouseYCoordinate());
	}
}

function mouseDragged() {
	if (isPanning) {
		const dxPixels = p.mouseX - startPanMouseX;
		const dyPixels = p.mouseY - startPanMouseY;
		
		// Convert pixel shift to world units (Y is inverted in our world coordinates)
		panOffset.x = startPanOffset.x - dxPixels / plane.unit;
		panOffset.y = startPanOffset.y + dyPixels / plane.unit;
		
		updateViewport();
		f.vectors = f.newVectors();
		redrawBackground();
		showExtentHUD();
	} else if (isMouseInCanvas() && hovering) {
		addParticle(mouseXCoordinate(), mouseYCoordinate());
	}
}

function touchPointForEvent(event) {
	const rect = planeCanvas.getBoundingClientRect();
	return {
		id: event.pointerId,
		x: (event.clientX - rect.left) * p.width / planeCanvas.scrollWidth,
		y: (event.clientY - rect.top) * p.height / planeCanvas.scrollHeight,
	};
}

function canvasTouchPoints() {
	return Array.from(activeCanvasTouches.values());
}

function beginTouchGesture(points = canvasTouchPoints()) {
	touchGesture = beginPinch({
		first: points[0],
		second: points[1],
		width: p.width,
		height: p.height,
		zoom,
		panOffset,
	});
	touchGestureOccurred = true;
}

function applyPendingTouchGesture() {
	touchGestureFrame = null;
	if (!touchGesture || !pendingTouchPoints) return;
	const result = updatePinch(touchGesture, {
		first: pendingTouchPoints[0],
		second: pendingTouchPoints[1],
		width: p.width,
		height: p.height,
	});
	zoom = result.zoom;
	panOffset = result.panOffset;
	updateViewport();
	plane = new Plane(p, config, viewport, panOffset, () => f);
	f.vectors = f.newVectors();
	redrawBackground();
	showExtentHUD();
}

function touchStarted(event) {
	if (!planeCanvas || event.target !== planeCanvas) return;
	inspectorPointerType = 'touch';
	requestRender();
	const point = touchPointForEvent(event);
	activeCanvasTouches.set(event.pointerId, point);
	const points = canvasTouchPoints();

	if (points.length >= 2) {
		beginTouchGesture(points);
	} else if (points.length === 1) {
		touchStartPoint = { x: point.x, y: point.y };
		touchPaintMoved = false;
		touchGestureOccurred = false;
	}
	return false;
}

function touchMoved(event) {
	if (!planeCanvas || !activeCanvasTouches.has(event.pointerId)) return;
	const point = touchPointForEvent(event);
	activeCanvasTouches.set(event.pointerId, point);
	const currentPoints = canvasTouchPoints();

	if (currentPoints.length >= 2) {
		if (!touchGesture) beginTouchGesture(currentPoints);
		pendingTouchPoints = currentPoints.slice(0, 2).map(touch => ({ x: touch.x, y: touch.y }));
		if (touchGestureFrame === null) {
			touchGestureFrame = requestAnimationFrame(applyPendingTouchGesture);
		}
	} else if (currentPoints.length === 1 && !touchGestureOccurred) {
		touchPaintMoved = true;
		addParticle(plane.pixelToX(point.x), plane.pixelToY(point.y));
	}
	return false;
}

function touchEnded(event) {
	if (!activeCanvasTouches.has(event.pointerId)) return;
	activeCanvasTouches.delete(event.pointerId);

	if (activeCanvasTouches.size < 2) {
		if (touchGestureFrame !== null) {
			cancelAnimationFrame(touchGestureFrame);
			applyPendingTouchGesture();
		}
		touchGesture = null;
		pendingTouchPoints = null;
		touchGestureFrame = null;
	}
	if (activeCanvasTouches.size === 0) {
		if (touchStartPoint && !touchPaintMoved && !touchGestureOccurred) {
			addParticle(
				plane.pixelToX(touchStartPoint.x),
				plane.pixelToY(touchStartPoint.y)
			);
		}
		touchStartPoint = null;
		touchPaintMoved = false;
		touchGestureOccurred = false;
	}
	return false;
}

let extentHudTimeout;
function updateExtentHUD() {
	const zoomHud = document.getElementById('zoomHud');
	if (zoomHud) {
		const format = value => Number(value.toFixed(1));
		zoomHud.textContent = `Range: [${format(viewport.x.min)}, ${format(viewport.x.max)}] × [${format(viewport.y.min)}, ${format(viewport.y.max)}]`;
	}
}

function showExtentHUD() {
	const zoomHud = document.getElementById('zoomHud');
	if (zoomHud) {
		updateExtentHUD();
		zoomHud.classList.add('visible');
		clearTimeout(extentHudTimeout);
		extentHudTimeout = setTimeout(() => {
			zoomHud.classList.remove('visible');
		}, 1500);
	}
}

function mouseWheel(event) {
	if (hovering) {
		const zoomDir = event.deltaY > 0 ? 1 : -1;
		zoom = p.constrain(zoom + zoomDir * 0.5, 1, 20);
		updateViewport();
		plane = new Plane(p, config, viewport, panOffset, () => f);
		f.vectors = f.newVectors();
		redrawBackground();
		showExtentHUD();
		return false; // prevent page scroll while zooming the canvas
	}
}

function applyVectorFunction(vf) {
	f.func = vf.eval;
	f.vectors = f.newVectors();
	system.invalidateFieldSamples();
	redrawBackground();
	currentXExpr = vf.xExpr;
	currentYExpr = vf.yExpr;
	currentXLatex = vf.xLatex;
	currentYLatex = vf.yLatex;
	renderFunctionHeading();
	updatePresetSelection(vf);
}

function setVectorField(id) {
	const preset = vectorPresets.find(candidate => candidate.id === id);
	if (preset) applyVectorFunction(preset.field);
}

function presetLabel(preset) {
	const vf = preset.field;
	return preferences.notation === 'basis'
		? `${vf.xExpr} i + ${vf.yExpr} j`
		: `⟨ ${vf.xExpr}, ${vf.yExpr} ⟩`;
}

function presetLatex(preset) {
	const vf = preset.field;
	return preferences.notation === 'basis'
		? `${vf.xLatex} \\mathbf{i} + ${vf.yLatex} \\mathbf{j}`
		: `\\left\\langle ${vf.xLatex}, ${vf.yLatex} \\right\\rangle`;
}

function updatePresetSelection(vf) {
	const match = vectorPresets.find(preset => (
		preset.field.xExpr === vf.xExpr && preset.field.yExpr === vf.yExpr
	));
	for (const button of document.querySelectorAll('.vector-preset')) {
		button.setAttribute('aria-pressed', String(button.dataset.presetId === match?.id));
	}
}

function renderPresetFormulas() {
	const dialog = document.getElementById('presetDialog');
	const body = document.getElementById('presetDialogBody');
	if (!dialog || !body) return;
	dialog.dataset.notation = preferences.notation;
	const mathJax = window.MathJax;
	if (typeof mathJax?.typesetClear === 'function') mathJax.typesetClear([body]);
	for (const button of body.querySelectorAll('.vector-preset')) {
		const preset = vectorPresets.find(candidate => candidate.id === button.dataset.presetId);
		if (!preset) continue;
		button.setAttribute('aria-label', `${preset.name}: ${presetLabel(preset)}`);
		button.querySelector('.vector-preset-formula').innerHTML = `\\(${presetLatex(preset)}\\)`;
	}
	if (typeof mathJax?.typesetPromise === 'function') {
		mathJax.typesetPromise([body]).catch((error) => {
			console.error('MathJax preset typesetting failed:', error);
		});
	}
}

function buildPresetCards() {
	const body = document.getElementById('presetDialogBody');
	if (!body) return;
	const categories = new Map();
	for (const preset of vectorPresets) {
		let grid = categories.get(preset.category);
		if (!grid) {
			const section = document.createElement('section');
			section.className = 'preset-category';
			const heading = document.createElement('h3');
			heading.textContent = preset.category;
			grid = document.createElement('div');
			grid.className = 'vector-preset-grid';
			section.append(heading, grid);
			body.appendChild(section);
			categories.set(preset.category, grid);
		}

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'vector-preset';
		button.dataset.presetId = preset.id;
		button.setAttribute('aria-pressed', 'false');
		const name = document.createElement('span');
		name.className = 'vector-preset-name';
		name.textContent = preset.name;
		const formula = document.createElement('span');
		formula.className = 'vector-preset-formula';
		formula.setAttribute('aria-hidden', 'true');
		button.append(name, formula);
		grid.appendChild(button);
	}
}

function updateNotationUI() {
	functionEl.dataset.notation = preferences.notation;
	partXEl.setAttribute('aria-label', preferences.notation === 'basis' ? 'Edit i component' : 'Edit X component');
	partYEl.setAttribute('aria-label', preferences.notation === 'basis' ? 'Edit j component' : 'Edit Y component');
	const helpExample = document.getElementById('notationHelpExample');
	if (helpExample) {
		helpExample.textContent = preferences.notation === 'basis'
			? 'F(x,y) = P(x,y)i + Q(x,y)j'
			: 'F(x,y) = ⟨P(x,y), Q(x,y)⟩';
	}
	renderPresetFormulas();
}

function applyNotation(notation) {
	preferences = { ...preferences, notation };
	updateNotationUI();
	savePreferences(preferences);
	requestRender();
}

function renderFunctionHeading() {
	const mathJax = window.MathJax;
	if (typeof mathJax?.typesetClear === 'function') {
		mathJax.typesetClear([partXEl, partYEl]);
	}
	partXEl.innerHTML = `\\(${currentXLatex}\\)`;
	partYEl.innerHTML = `\\(${currentYLatex}\\)`;
	if (typeof mathJax?.typesetPromise === 'function') {
		mathJax.typesetPromise([functionEl]).catch((error) => {
			console.error('MathJax typesetting failed:', error);
		});
	}
}

function showFnError(message) {
	fnErrorEl.textContent = message;
	fnErrorEl.classList.add('visible');
	const header = document.getElementById('mathHeader');
	if (header) {
		header.classList.add('has-error');
	}
}

function clearFnError() {
	fnErrorEl.textContent = '';
	fnErrorEl.classList.remove('visible');
	const header = document.getElementById('mathHeader');
	if (header) {
		header.classList.remove('has-error');
	}
}

function tryCommit(part, value) {
	const xExpr = part === 'x' ? value : currentXExpr;
	const yExpr = part === 'y' ? value : currentYExpr;
	try {
		const vf = new VectorFunction(xExpr, yExpr);
		clearFnError();
		applyVectorFunction(vf);
		
		// Visual feedback: success pulse
		const header = document.getElementById('mathHeader');
		if (header) {
			header.classList.add('valid-pulse');
			setTimeout(() => header.classList.remove('valid-pulse'), 800);
		}
		return true;
	} catch (e) {
		showFnError(e.message);
		return false;
	}
}

function buildShareUrl() {
	return createShareUrl(window.location, { fx: currentXExpr, fy: currentYExpr });
}

async function copyShareLink() {
	const shareUrl = buildShareUrl();
	let copied = false;
	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
		} catch (e) {
			// Fall through to the legacy copy method used by plain HTTP LAN hosts.
		}
	}
	if (!copied) {
		const input = document.createElement('textarea');
		input.value = shareUrl;
		input.setAttribute('readonly', '');
		input.style.position = 'fixed';
		input.style.opacity = '0';
		document.body.appendChild(input);
		input.select();
		try {
			copied = document.execCommand('copy');
		} catch (e) {
			copied = false;
		}
		input.remove();
	}

	if (!copied) {
		window.prompt('Copy this share link:', shareUrl);
		return;
	}
	shareButton.innerHTML = '<i class="fas fa-check"></i>';
	shareButton.title = 'Link copied';
	shareButton.setAttribute('aria-label', 'Share link copied');
	setTimeout(() => {
		shareButton.innerHTML = '<i class="fas fa-share-alt"></i>';
		shareButton.title = 'Share this vector field';
		shareButton.setAttribute('aria-label', 'Copy a link to this vector field');
	}, 1500);
}

function beginEdit(part) {
	const span = part === 'x' ? partXEl : partYEl;
	if (span.querySelector('.fn-edit')) return; // already editing
	const expr = part === 'x' ? currentXExpr : currentYExpr;
	const input = document.createElement('input');
	input.type = 'text';
	input.className = 'fn-edit';
	input.spellcheck = false;
	input.value = expr;
	input.size = Math.max(expr.length, 3);
	span.innerHTML = '';
	span.appendChild(input);
	input.focus();
	input.select();
	requestRender();
	let finished = false;
	
	input.addEventListener('input', () => {
		input.size = Math.max(input.value.length, 3);
	});
	
	input.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			finished = true;
			if (!tryCommit(part, input.value)) {
				finished = false; // invalid, stay in edit mode
				input.classList.add('input-error');
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			finished = true;
			clearFnError();
			renderFunctionHeading();
			requestRender();
		}
	});
	
	input.addEventListener('blur', () => {
		if (finished) return;
		finished = true;
		if (!tryCommit(part, input.value)) {
			renderFunctionHeading(); // revert to last valid
			requestRender();
		}
	});
}

function updatePlayPauseButton() {
	playPauseButton.innerHTML = paused ? '<i class="fas fa-play"></i> <span>Play</span>' : '<i class="fas fa-pause"></i> <span>Pause</span>';
	playPauseButton.classList.toggle('active', !paused);
	playPauseButton.setAttribute('aria-pressed', String(!paused));
}

function updateToggleButtons() {
	toggleParticlesButton.classList.toggle('active', showParticles);
	toggleParticlesButton.innerHTML = showParticles ? '<i class="fas fa-eye"></i> Particles' : '<i class="fas fa-eye-slash"></i> Particles';
	toggleParticlesButton.setAttribute('aria-pressed', String(showParticles));
	toggleVectorsButton.classList.toggle('active', showVectorField);
	toggleVectorsButton.setAttribute('aria-pressed', String(showVectorField));
	toggleAxesButton.classList.toggle('active', showAxes);
	toggleAxesButton.setAttribute('aria-pressed', String(showAxes));
	toggleGridButton.classList.toggle('active', showGrid);
	toggleGridButton.setAttribute('aria-pressed', String(showGrid));
	toggleInspectorButton.classList.toggle('active', preferences.showInspector);
	toggleInspectorButton.setAttribute('aria-pressed', String(preferences.showInspector));
}

function setupUI(initialVectorFunction) {
	functionEl = document.querySelector('.function-panel');
	partXEl = document.getElementById('partX');
	partYEl = document.getElementById('partY');
	fnErrorEl = document.getElementById('fnError');
	planeCanvas = document.getElementById('plane');
	fieldInspectorEl = document.getElementById('fieldInspector');
	
	playPauseButton = document.getElementById('playPause');
	clearButton = document.getElementById('clearParticles');
	respawnButton = document.getElementById('respawnParticles');
	shareButton = document.getElementById('shareLink');
	
	toggleParticlesButton = document.getElementById('toggleParticles');
	toggleVectorsButton = document.getElementById('toggleVectors');
	toggleAxesButton = document.getElementById('toggleAxes');
	toggleGridButton = document.getElementById('toggleGrid');
	toggleInspectorButton = document.getElementById('toggleInspector');
	
	// Actions
	playPauseButton.addEventListener('click', () => {
		paused = !paused;
		updatePlayPauseButton();
		requestParticleRender();
	});
	clearButton.addEventListener('click', () => {
		system.empty();
		requestRender();
	});
	respawnButton.addEventListener('click', () => {
		system.respawn();
		requestParticleRender();
	});
	shareButton.addEventListener('click', copyShareLink);

	const openHelpButton = document.getElementById('openHelpBtn');
	const closeHelpButton = document.getElementById('closeHelpBtn');
	const helpDialog = document.getElementById('helpDialog');
	if (openHelpButton && closeHelpButton && helpDialog) {
		openHelpButton.addEventListener('click', () => helpDialog.showModal());
		closeHelpButton.addEventListener('click', () => helpDialog.close());
		helpDialog.addEventListener('click', (event) => {
			if (event.target === helpDialog) helpDialog.close();
		});
	}
	const openPresetsButton = document.getElementById('openPresetsBtn');
	const closePresetsButton = document.getElementById('closePresetsBtn');
	const presetDialog = document.getElementById('presetDialog');
	const presetDialogBody = document.getElementById('presetDialogBody');
	if (openPresetsButton && closePresetsButton && presetDialog && presetDialogBody) {
		buildPresetCards();
		openPresetsButton.addEventListener('click', () => presetDialog.showModal());
		closePresetsButton.addEventListener('click', () => presetDialog.close());
		presetDialog.addEventListener('click', (event) => {
			if (event.target === presetDialog) presetDialog.close();
		});
		presetDialog.addEventListener('close', () => openPresetsButton.focus());
		presetDialogBody.addEventListener('click', (event) => {
			const button = event.target.closest('.vector-preset');
			if (!button) return;
			setVectorField(button.dataset.presetId);
			presetDialog.close();
		});
	}

	// Toggles
	toggleParticlesButton.addEventListener('click', () => {
		showParticles = !showParticles;
		persistPreferences();
		updateToggleButtons();
		requestParticleRender();
	});
	toggleVectorsButton.addEventListener('click', () => {
		showVectorField = !showVectorField;
		persistPreferences();
		redrawBackground();
		updateToggleButtons();
		updateMagnitudeLegend();
	});
	toggleAxesButton.addEventListener('click', () => {
		showAxes = !showAxes;
		persistPreferences();
		redrawBackground();
		updateToggleButtons();
	});
	toggleGridButton.addEventListener('click', () => {
		showGrid = !showGrid;
		persistPreferences();
		redrawBackground();
		updateToggleButtons();
	});
	toggleInspectorButton.addEventListener('click', () => {
		preferences = { ...preferences, showInspector: !preferences.showInspector };
		savePreferences(preferences);
		updateToggleButtons();
		requestRender();
	});

	// Hover Canvas states
	const updateInspectorPoint = (event) => {
		const rect = planeCanvas.getBoundingClientRect();
		inspectorPoint = {
			x: (event.clientX - rect.left) * p.width / rect.width,
			y: (event.clientY - rect.top) * p.height / rect.height,
		};
	};
	planeCanvas.addEventListener('pointerenter', (event) => {
		hovering = true;
		inspectorPointerType = event.pointerType || 'mouse';
		updateInspectorPoint(event);
		planeCanvas.classList.add('hovering');
		requestInspectorRender();
	});
	planeCanvas.addEventListener('pointermove', (event) => {
		inspectorPointerType = event.pointerType || 'mouse';
		updateInspectorPoint(event);
		if (inspectorPointerType !== 'touch') requestInspectorRender();
	});
	planeCanvas.addEventListener('pointerleave', () => {
		hovering = false;
		inspectorPoint = null;
		planeCanvas.classList.remove('hovering');
		requestRender();
	});
	
	// Inline Math Clicking
	partXEl.addEventListener('click', () => beginEdit('x'));
	partYEl.addEventListener('click', () => beginEdit('y'));
	partXEl.addEventListener('keydown', (event) => {
		if (event.target === partXEl && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			beginEdit('x');
		}
	});
	partYEl.addEventListener('keydown', (event) => {
		if (event.target === partYEl && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			beginEdit('y');
		}
	});

	const themeSelect = document.getElementById('themeSelect');
	if (themeSelect) {
		themeSelect.value = preferences.theme;
		themeSelect.addEventListener('change', (event) => applyTheme(event.target.value));
	}
	const notationSelect = document.getElementById('notationSelect');
	if (notationSelect) {
		notationSelect.value = preferences.notation;
		notationSelect.addEventListener('change', event => applyNotation(event.target.value));
	}
	updateNotationUI();

	const vectorMagnitudeMode = document.getElementById('vectorMagnitudeMode');
	const vectorColorControls = document.getElementById('vectorColorControls');
	const updateGradientPresetSelection = (container, lowColor, highColor) => {
		for (const button of container.querySelectorAll('.gradient-preset')) {
			button.setAttribute('aria-pressed', String(
				button.dataset.lowColor === lowColor && button.dataset.highColor === highColor
			));
		}
	};
	const updateSolidPresetSelection = (container, color) => {
		for (const button of container.querySelectorAll('.solid-preset')) {
			button.setAttribute('aria-pressed', String(button.dataset.color === color));
		}
	};
	const updateVectorControls = () => {
		vectorColorControls.hidden = vectorMagnitudeMode.value !== 'color';
		updateGradientPresetSelection(vectorColorControls, preferences.vectorLowColor, preferences.vectorHighColor);
	};
	vectorMagnitudeMode.value = preferences.vectorMagnitudeMode;
	updateVectorControls();
	vectorMagnitudeMode.addEventListener('change', event => {
		updateVectorControls();
		applyVectorAppearance({ vectorMagnitudeMode: event.target.value });
	});
	vectorColorControls.addEventListener('click', event => {
		const button = event.target.closest('.gradient-preset');
		if (!button) return;
		applyVectorAppearance({
			vectorLowColor: button.dataset.lowColor,
			vectorHighColor: button.dataset.highColor,
		});
		updateVectorControls();
	});

	const particleColorMode = document.getElementById('particleColorMode');
	const particleUniformColorControl = document.getElementById('particleUniformColorControl');
	const updateParticleColorControls = () => {
		const usesMagnitude = particleColorMode.value === 'magnitude';
		particleUniformColorControl.hidden = usesMagnitude;
		updateSolidPresetSelection(particleUniformColorControl, preferences.particleColor);
	};
	particleColorMode.value = preferences.particleColorMode;
	updateParticleColorControls();
	particleColorMode.addEventListener('change', event => {
		applyParticleAppearance({ particleColorMode: event.target.value });
		updateParticleColorControls();
		requestParticleRender();
	});
	particleUniformColorControl.addEventListener('click', event => {
		const button = event.target.closest('.solid-preset');
		if (!button) return;
		applyParticleAppearance({ particleColor: button.dataset.color });
		updateParticleColorControls();
		requestParticleRender();
	});
	// Sliders Binding
	const speedSlider = document.getElementById('speedSlider');
	const speedValue = document.getElementById('speedValue');
	if (speedSlider && speedValue) {
		speedSlider.value = config.plane.velocity;
		speedValue.textContent = config.plane.velocity.toFixed(2);
		speedSlider.addEventListener('input', (e) => {
			config.plane.velocity = parseFloat(e.target.value);
			speedValue.textContent = config.plane.velocity.toFixed(2);
			persistPreferences();
		});
	}

	const vectorSpacingSlider = document.getElementById('vectorSpacingSlider');
	const vectorSpacingValue = document.getElementById('vectorSpacingValue');
	if (vectorSpacingSlider && vectorSpacingValue) {
		vectorSpacingSlider.value = config.vector.spacing;
		vectorSpacingValue.textContent = config.vector.spacing.toFixed(2);
		vectorSpacingSlider.addEventListener('input', (e) => {
			config.vector.spacing = parseFloat(e.target.value);
			vectorSpacingValue.textContent = config.vector.spacing.toFixed(2);
			f.spacing = config.vector.spacing;
			f.vectors = f.newVectors();
			redrawBackground();
			persistPreferences();
		});
	}

	const particleSizeSlider = document.getElementById('particleSizeSlider');
	const particleSizeValue = document.getElementById('particleSizeValue');
	if (particleSizeSlider && particleSizeValue) {
		particleSizeSlider.value = config.particle.diameter;
		particleSizeValue.textContent = config.particle.diameter + 'px';
		particleSizeSlider.addEventListener('input', (e) => {
			config.particle.diameter = parseInt(e.target.value);
			particleSizeValue.textContent = config.particle.diameter + 'px';
			persistPreferences();
			requestParticleRender();
		});
	}

	const particleSpacingSlider = document.getElementById('particleSpacingSlider');
	const particleSpacingValue = document.getElementById('particleSpacingValue');
	if (particleSpacingSlider && particleSpacingValue) {
		particleSpacingSlider.value = config.particle.spacing;
		particleSpacingValue.textContent = config.particle.spacing.toFixed(2);
		particleSpacingSlider.addEventListener('change', (e) => {
			config.particle.spacing = parseFloat(e.target.value);
			particleSpacingValue.textContent = config.particle.spacing.toFixed(2);
			system.spacing = config.particle.spacing;
			persistPreferences();
			system.respawn();
			requestParticleRender();
		});
		particleSpacingSlider.addEventListener('input', (e) => {
			particleSpacingValue.textContent = parseFloat(e.target.value).toFixed(2);
		});
	}

	// Drawer triggers
	const toggleDrawerBtn = document.getElementById('toggleDrawerBtn');
	const closeDrawerBtn = document.getElementById('closeDrawerBtn');
	const controlDrawer = document.getElementById('controlDrawer');
	const mobileDrawerQuery = window.matchMedia('(max-width: 767px)');
	const setDrawerOpen = (open) => {
		controlDrawer.classList.toggle('open', open);
		controlDrawer.classList.toggle('closed', !open);
		controlDrawer.inert = !open;
		controlDrawer.setAttribute('aria-hidden', String(!open));
		toggleDrawerBtn.setAttribute('aria-expanded', String(open));
		if (!mobileDrawerQuery.matches) setTimeout(windowResized, 310);
	};
	const drawerIsOpen = () => !controlDrawer.classList.contains('closed');
	setDrawerOpen(!mobileDrawerQuery.matches);

	if (toggleDrawerBtn && controlDrawer) {
		toggleDrawerBtn.addEventListener('click', (e) => {
			setDrawerOpen(!drawerIsOpen());
			e.stopPropagation();
		});
	}
	if (closeDrawerBtn && controlDrawer) {
		closeDrawerBtn.addEventListener('click', () => {
			setDrawerOpen(false);
		});
	}

	// Close drawer when clicking outside it
	document.addEventListener('click', (e) => {
		if (mobileDrawerQuery.matches && drawerIsOpen()) {
			if (!controlDrawer.contains(e.target) && !toggleDrawerBtn.contains(e.target)) {
				setDrawerOpen(false);
			}
		}
	});

	// Keyboard shortcuts mirror the primary button actions. Inputs and editable
	// elements retain their normal typing behavior.
	window.addEventListener('keydown', (e) => {
		const target = e.target;
		const isEditable = target instanceof Element && (
			target.matches('input, select, textarea') || target.isContentEditable
		);
		if (isEditable || e.ctrlKey || e.metaKey || e.altKey) return;
		const openDialog = presetDialog.open ? presetDialog : helpDialog.open ? helpDialog : null;
		if (openDialog) {
			if (e.key === 'Escape') {
				e.preventDefault();
				openDialog.close();
			}
			return;
		}

		if (e.key === ' ' && e.target === document.body) {
			isSpacePressed = true;
			e.preventDefault();
			return;
		}
		if (e.repeat) return;

		const key = e.key.toLowerCase();
		const actions = {
			p: () => playPauseButton.click(),
			c: () => clearButton.click(),
			g: () => respawnButton.click(),
			v: () => toggleVectorsButton.click(),
			l: () => toggleGridButton.click(),
			a: () => toggleAxesButton.click(),
			s: () => setDrawerOpen(!drawerIsOpen()),
			'?': () => helpDialog.showModal(),
			escape: () => {
				if (drawerIsOpen()) setDrawerOpen(false);
			},
		};
		if (actions[key]) {
			e.preventDefault();
			actions[key]();
		}
	});
	window.addEventListener('keyup', (e) => {
		if (e.key === ' ') {
			isSpacePressed = false;
		}
	});

	// Setup initial UI active states
	updatePlayPauseButton();
	updateToggleButtons();
	updateMagnitudeLegend();

	// Render the shared field, or the default field when the URL did not provide one.
	applyVectorFunction(initialVectorFunction);
}

new p5((sketch) => {
	p = sketch;
	p.setup = setup;
	p.draw = draw;
	p.windowResized = windowResized;
	p.mousePressed = (event) => event.pointerType === 'touch' ? touchStarted(event) : mousePressed(event);
	p.mouseReleased = (event) => event.pointerType === 'touch' ? touchEnded(event) : mouseReleased(event);
	p.mouseClicked = (event) => event.pointerType === 'touch' ? false : mouseClicked(event);
	p.mouseDragged = (event) => event.pointerType === 'touch' ? touchMoved(event) : mouseDragged(event);
	p.mouseWheel = mouseWheel;
});
