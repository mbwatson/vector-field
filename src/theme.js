const CANVAS_THEMES = Object.freeze({
	dark: Object.freeze({
		background: [6, 6, 8],
		grid: [255, 255, 255, 30],
		axis: [148, 163, 184, 150],
		axisLabel: [148, 163, 184, 200],
		vector: [0, 242, 254, 210],
		particle: [236, 72, 153],
		hover: [0, 242, 254, 220],
	}),
	light: Object.freeze({
		background: [248, 250, 252],
		grid: [15, 23, 42, 28],
		axis: [71, 85, 105, 180],
		axisLabel: [51, 65, 85, 230],
		vector: [8, 145, 178, 235],
		particle: [190, 24, 93],
		hover: [8, 145, 178, 240],
	}),
});

function getCanvasTheme(theme) {
	return CANVAS_THEMES[theme] ?? CANVAS_THEMES.dark;
}

export { CANVAS_THEMES, getCanvasTheme };
