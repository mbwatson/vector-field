import { parseFunction } from './parser.js';

export class VectorField {
	constructor(p, config, viewport, initialFunction) {
		this.p = p;
		this.viewport = viewport;
		this.func = initialFunction;
		this.spacing = config.vector.spacing;
		this.vectors = this.newVectors();
	}
	eval(x, y) {
		return this.func(x, y);
	};
	newVectors() {
		let vectors = [];
		const spacing = this.spacing;
		
		// Align grid points to the current viewport bounds
		const startX = Math.floor(this.viewport.x.min / spacing) * spacing;
		const endX = Math.ceil(this.viewport.x.max / spacing) * spacing;
		const startY = Math.floor(this.viewport.y.min / spacing) * spacing;
		const endY = Math.ceil(this.viewport.y.max / spacing) * spacing;

		for (let x = startX; x <= endX; x += spacing) {
			for (let y = startY; y <= endY; y += spacing) {
				vectors.push(this.p.createVector(x, y));
			}
		}

		this.maxMag = 0;
		for (let v of vectors) {
			const tip = this.eval(v);
			v.tip = this.p.createVector(tip.x, tip.y);
			const mag = v.tip.mag();
			// Ignore singular points (NaN/Infinity) so they don't swamp the scale.
			if (isFinite(mag) && mag > this.maxMag) {
				this.maxMag = mag;
			}
		}
		// Guard against a zero field so magnitude normalization never divides by 0.
		if (this.maxMag === 0) {
			this.maxMag = 1;
		}
		return vectors;
	}
}

export class VectorFunction {
	// Built from the two raw component expression strings. The parser derives
	// both the compiled functions and the LaTeX, so presets and user-entered
	// fields share one code path and every field keeps its editable source text.
	constructor(xExpr, yExpr) {
		const px = parseFunction(xExpr);
		const py = parseFunction(yExpr);
		this.xExpr = xExpr;
		this.yExpr = yExpr;
		this.xLatex = px.latex;
		this.yLatex = py.latex;
		this.eval = function({x, y}) { return {'x': px.fn(x, y), 'y': py.fn(x, y)} };
		this.latex = `$\\langle ${px.latex}, ${py.latex} \\rangle$`;
	}
}
