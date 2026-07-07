function vectorEncoding(mode, magnitude, maxMagnitude, baseLength) {
	if (!Number.isFinite(magnitude) || !Number.isFinite(maxMagnitude) || magnitude <= 0 || maxMagnitude <= 0) {
		return null;
	}
	const normalizedMagnitude = Math.min(Math.max(magnitude / maxMagnitude, 0), 1);
	let length = baseLength;
	if (mode === 'length') {
		const minimumLength = Math.min(baseLength, Math.max(baseLength * 0.2, 3));
		length = minimumLength + (baseLength - minimumLength) * normalizedMagnitude;
	}
	return {
		length,
		arrowheadSize: Math.min(Math.max(length / 6, 2), length / 2),
		colorPosition: mode === 'color' ? magnitudeColorPosition(magnitude, maxMagnitude) : null,
		normalizedMagnitude,
	};
}

function magnitudeColorPosition(magnitude, maxMagnitude) {
	if (!Number.isFinite(magnitude) || !Number.isFinite(maxMagnitude) || magnitude <= 0 || maxMagnitude <= 0) {
		return 0;
	}
	return Math.sqrt(Math.min(Math.max(magnitude / maxMagnitude, 0), 1));
}

export { magnitudeColorPosition, vectorEncoding };
