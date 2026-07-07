import { vectorEncoding } from './vectorEncoding.js';

export class Plane {
	constructor(p, config, viewport, panOffset, getVectorField) {
		this.p = p;
		this.viewport = viewport;
		this.panOffset = panOffset;
		this.getVectorField = getVectorField;
		this.unit = p.width / (viewport.x.max - viewport.x.min);
		this.tickSize = config.plane.grid.axis.tickmarkSize;
		this.axisColor = config.plane.grid.axis.color;
		this.axisLabelColor = config.plane.grid.axis.labelColor;
		this.axisWeight = config.plane.grid.axis.weight;
		this.gridColor = config.plane.grid.color;
		this.gridWeight = config.plane.grid.weight;
		this.vectorMode = config.vector.mode;
		this.vectorColor = config.vector.color;
		this.vectorLowColor = config.vector.lowColor;
		this.vectorHighColor = config.vector.highColor;
		this.vectorWeight = config.vector.weight;
		this.vectorLength = this.unit * (config.vector.spacing / 2);
	}
	xToPixel(x) {
		return this.p.width / 2 + (x - this.panOffset.x) * this.unit;
	}
	yToPixel(y) {
		return this.p.height / 2 - (y - this.panOffset.y) * this.unit;
	}
	pixelToX(x) {
		return (x - this.p.width / 2) / this.unit + this.panOffset.x;
	}
	pixelToY(y) {
		return (this.p.height / 2 - y) / this.unit + this.panOffset.y;
	}
	// Every drawing method takes a graphics target `g` (the main canvas or an
	// offscreen p5.Graphics buffer). This lets the static plane be rendered once
	// into a cached buffer and only redrawn when the field or toggles change,
	// instead of every animation frame.
	drawAxes(g) {
		g.stroke(this.axisColor);
		g.strokeWeight(this.axisWeight);
		
		// Draw Y axis (x = 0)
		g.line(this.xToPixel(0), this.yToPixel(this.viewport.y.min), this.xToPixel(0), this.yToPixel(this.viewport.y.max));
		// Draw X axis (y = 0)
		g.line(this.xToPixel(this.viewport.x.min), this.yToPixel(0), this.xToPixel(this.viewport.x.max), this.yToPixel(0));

		// Determine step interval based on current zoom range to prevent overlapping labels
		const rangeX = this.viewport.x.max - this.viewport.x.min;
		let step = 1;
		if (rangeX > 24) step = 4;
		else if (rangeX > 12) step = 2;
		else if (rangeX < 5) step = 0.5;

		for (let i = step; i <= this.viewport.x.max; i += step) {
			this.xTick(g, i);
		}
		for (let i = -step; i >= this.viewport.x.min; i -= step) {
			this.xTick(g, i);
		}
		for (let j = step; j <= this.viewport.y.max; j += step) {
			this.yTick(g, j);
		}
		for (let j = -step; j >= this.viewport.y.min; j -= step) {
			this.yTick(g, j);
		}
		this.drawLabels(g, step);
	}
	drawLabels(g, step) {
		g.noStroke();
		g.fill(this.axisLabelColor);
		g.textSize(10);
		
		// X Labels (drawn below the X axis)
		g.textAlign(this.p.CENTER, this.p.TOP);
		for (let i = step; i <= this.viewport.x.max; i += step) {
			const labelStr = i.toFixed(step % 1 === 0 ? 0 : 1);
			g.text(labelStr, this.xToPixel(i), this.yToPixel(0) + this.tickSize + 3);
		}
		for (let i = -step; i >= this.viewport.x.min; i -= step) {
			const labelStr = i.toFixed(step % 1 === 0 ? 0 : 1);
			g.text(labelStr, this.xToPixel(i), this.yToPixel(0) + this.tickSize + 3);
		}

		// Y Labels (drawn to the left of the Y axis)
		g.textAlign(this.p.RIGHT, this.p.CENTER);
		for (let j = step; j <= this.viewport.y.max; j += step) {
			const labelStr = j.toFixed(step % 1 === 0 ? 0 : 1);
			g.text(labelStr, this.xToPixel(0) - this.tickSize - 6, this.yToPixel(j));
		}
		for (let j = -step; j >= this.viewport.y.min; j -= step) {
			const labelStr = j.toFixed(step % 1 === 0 ? 0 : 1);
			g.text(labelStr, this.xToPixel(0) - this.tickSize - 6, this.yToPixel(j));
		}
	}
	drawGrid(g) {
		g.stroke(this.gridColor);
		g.strokeWeight(this.gridWeight);

		const rangeX = this.viewport.x.max - this.viewport.x.min;
		let step = 1;
		if (rangeX > 24) step = 4;
		else if (rangeX > 12) step = 2;
		else if (rangeX < 5) step = 0.5;

		const startX = Math.floor(this.viewport.x.min / step) * step;
		const endX = Math.ceil(this.viewport.x.max / step) * step;
		for (let x = startX; x <= endX; x += step) {
			g.line(this.xToPixel(x), this.yToPixel(this.viewport.y.min), this.xToPixel(x), this.yToPixel(this.viewport.y.max));
		}

		const startY = Math.floor(this.viewport.y.min / step) * step;
		const endY = Math.ceil(this.viewport.y.max / step) * step;
		for (let y = startY; y <= endY; y += step) {
			g.line(this.xToPixel(this.viewport.x.min), this.yToPixel(y), this.xToPixel(this.viewport.x.max), this.yToPixel(y));
		}
	}
	xTick(g, value) {
		g.noFill();
		g.stroke(this.axisColor);
		g.strokeWeight(this.axisWeight);
		g.line(this.xToPixel(value), this.yToPixel(0) - this.tickSize, this.xToPixel(value), this.yToPixel(0) + this.tickSize);
	}
	yTick(g, value) {
		g.stroke(this.axisColor);
		g.strokeWeight(this.axisWeight);
		g.line(this.xToPixel(0) - this.tickSize, this.yToPixel(value), this.xToPixel(0) + this.tickSize, this.yToPixel(value));
	}
	drawVectorField(g) {
		const f = this.getVectorField();
		for (let v of f.vectors) {
			this.drawLocatedVector(g, v, v.tip);
		}
	}
	magnitudeColor(position) {
		return this.p.lerpColor(this.vectorLowColor, this.vectorHighColor, position);
	}
	drawLocatedVector(g, location, v) {
		const f = this.getVectorField();
		const encoding = vectorEncoding(this.vectorMode, v.mag(), f.maxMag, this.vectorLength);
		if (!encoding) return;
		const vectorColor = this.vectorMode === 'color'
			? this.magnitudeColor(encoding.colorPosition)
			: this.vectorColor;
		g.push();
		g.strokeWeight(this.vectorWeight);
		g.stroke(vectorColor);
		g.fill(vectorColor);
		g.translate(this.xToPixel(location.x), this.yToPixel(location.y));
		g.rotate(this.p.PI - v.heading());
		g.line(0, 0, -encoding.length, 0);
		g.translate(-encoding.length, 0);
		g.triangle(0, 0, encoding.arrowheadSize, encoding.arrowheadSize / 2, encoding.arrowheadSize, -encoding.arrowheadSize / 2);
		g.pop();
	}
}
