export class Particle {
	constructor(config, x, y) {
		this.config = config;
		this.diameter = 0;
		this.x = x;
		this.y = y;
		this.dx = 0;
		this.dy = 0;
		this.new = true;
		this.fieldSample = null;
	}
	updateDiameter() {
		const targetDiameter = this.config.particle.diameter;
		if (this.new) {
			this.diameter += 1;
			if (this.diameter >= targetDiameter) {
				this.diameter = targetDiameter;
				this.new = false;
			}
		} else {
			this.diameter = targetDiameter;
		}
	}
	speed() {
		return Math.sqrt(this.dx**2 + this.dy**2);
	}
	evaluateField(force) {
		if (this.fieldSample?.x === this.x && this.fieldSample?.y === this.y) {
			return this.fieldSample;
		}
		const vector = force.eval(this);
		const rawMagnitude = Number.isFinite(vector.x) && Number.isFinite(vector.y)
			? Math.hypot(vector.x, vector.y)
			: 0;
		const magnitude = rawMagnitude === Infinity ? Number.MAX_VALUE : rawMagnitude;
		this.fieldSample = { x: this.x, y: this.y, vector, magnitude };
		return this.fieldSample;
	}
	invalidateFieldSample() {
		this.fieldSample = null;
	}
	applyForce(force) {
		if (this.config.plane.velocity != 0) {
			const v = this.evaluateField(force).vector;
			let dx = v.x * this.config.plane.velocity / 500;
			let dy = v.y * this.config.plane.velocity / 500;
			// Custom fields may be singular (e.g. 1/x, ln(y)); skip the step
			// there rather than sending the particle to NaN/Infinity.
			if (!isFinite(dx) || !isFinite(dy)) {
				dx = dy = 0;
			}
			this.dx = dx;
			this.dy = dy;
		} else {
			this.dx = this.dy = 0;
		}
		this.x += this.dx;
		this.y += this.dy;
	}
	update() {
		this.x += this.dx;
		this.y += this.dy;
	}
}
