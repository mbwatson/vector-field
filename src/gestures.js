function midpoint(first, second) {
	return {
		x: (first.x + second.x) / 2,
		y: (first.y + second.y) / 2,
	};
}

function beginPinch({ first, second, width, height, zoom, panOffset }) {
	const center = midpoint(first, second);
	const unit = width / (2 * zoom);
	return {
		distance: Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1),
		zoom,
		anchor: {
			x: panOffset.x + (center.x - width / 2) / unit,
			y: panOffset.y - (center.y - height / 2) / unit,
		},
	};
}

function updatePinch(gesture, { first, second, width, height, minZoom = 1, maxZoom = 20 }) {
	const center = midpoint(first, second);
	const distance = Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1);
	const zoom = Math.min(Math.max(gesture.zoom * gesture.distance / distance, minZoom), maxZoom);
	const unit = width / (2 * zoom);
	return {
		zoom,
		panOffset: {
			x: gesture.anchor.x - (center.x - width / 2) / unit,
			y: gesture.anchor.y + (center.y - height / 2) / unit,
		},
	};
}

export { beginPinch, updatePinch };
