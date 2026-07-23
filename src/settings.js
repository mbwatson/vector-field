import { parseFunction } from './parser.js';

const PREFERENCES_STORAGE_KEY = 'vector-field.preferences.v1';

const DEFAULT_PREFERENCES = Object.freeze({
	theme: 'dark',
	vectorMagnitudeMode: 'color',
	vectorLowColor: '#00f2fe',
	vectorHighColor: '#ec4899',
	particleColorMode: 'uniform',
	particleColor: '#ec4899',
	notation: 'component',
	speed: 1,
	vectorSpacing: 0.5,
	particleSize: 8,
	particleSpacing: 0.5,
	showParticles: true,
	showVectors: true,
	showAxes: true,
	showGrid: true,
	inspectParticles: true,
});

const validators = {
	theme: oneOf('dark', 'light'),
	vectorMagnitudeMode: oneOf('color', 'length', 'uniform'),
	vectorLowColor: isHexColor,
	vectorHighColor: isHexColor,
	particleColorMode: oneOf('uniform', 'magnitude'),
	particleColor: isHexColor,
	notation: oneOf('component', 'basis'),
	speed: numberInRange(0, 4),
	vectorSpacing: numberInRange(0.25, 2),
	particleSize: numberInRange(2, 20),
	particleSpacing: numberInRange(0.25, 2),
	showParticles: isBoolean,
	showVectors: isBoolean,
	showAxes: isBoolean,
	showGrid: isBoolean,
	inspectParticles: isBoolean,
};

function oneOf(...values) {
	return value => values.includes(value);
}

function isHexColor(value) {
	return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function isBoolean(value) {
	return typeof value === 'boolean';
}

function numberInRange(min, max) {
	return value => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function validatePreferences(value) {
	const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
	const preferences = {};
	for (const [name, defaultValue] of Object.entries(DEFAULT_PREFERENCES)) {
		preferences[name] = validators[name](source[name]) ? source[name] : defaultValue;
	}
	return preferences;
}

function loadPreferences(storage) {
	try {
		storage ??= globalThis.localStorage;
		const stored = storage?.getItem(PREFERENCES_STORAGE_KEY);
		return validatePreferences(stored === null ? null : JSON.parse(stored));
	} catch {
		return validatePreferences(null);
	}
}

function savePreferences(preferences, storage) {
	const validated = validatePreferences(preferences);
	try {
		storage ??= globalThis.localStorage;
		storage?.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(validated));
		return true;
	} catch {
		return false;
	}
}

function readSharedField(search, fallback) {
	const params = new URLSearchParams(search);
	if (!params.has('fx') || !params.has('fy')) return { ...fallback };

	const field = { fx: params.get('fx'), fy: params.get('fy') };
	try {
		parseFunction(field.fx);
		parseFunction(field.fy);
		return field;
	} catch {
		return { ...fallback };
	}
}

function buildShareUrl(location, field) {
	const url = new URL(location.href ?? location);
	url.search = '';
	url.hash = '';
	url.searchParams.set('fx', field.fx);
	url.searchParams.set('fy', field.fy);
	return url.toString();
}

export {
	DEFAULT_PREFERENCES,
	PREFERENCES_STORAGE_KEY,
	buildShareUrl,
	loadPreferences,
	readSharedField,
	savePreferences,
	validatePreferences,
};
