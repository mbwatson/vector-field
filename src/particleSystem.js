import { Particle } from './particle.js';
import { magnitudeColorPosition } from './vectorEncoding.js';

const magnitudeBinCount = 64;

export class ParticleSystem {
	constructor(p, config, viewport, getPlane) {
		this.p = p;
		this.config = config;
		this.viewport = viewport;
		this.getPlane = getPlane;
		this.spacing = config.particle.spacing;
		this.particles = this.newParticles();
		this.magnitudeBins = Array.from({ length: magnitudeBinCount }, () => []);
		this.magnitudePalette = null;
		this.paletteLowColor = null;
		this.paletteHighColor = null;
	}
	createParticle(x, y) {
		return new Particle(this.config, x, y);
	}
	newParticles() {
		let particles = [];
		let quadrantSize = Math.max(this.viewport.x.max, this.viewport.y.max);
		particles.push(this.createParticle(0, 0));
		for (let i = this.spacing; i <= quadrantSize; i += this.spacing) {
			particles.push(this.createParticle(i, 0));
			particles.push(this.createParticle(-i, 0));
			particles.push(this.createParticle(0, i));
			particles.push(this.createParticle(0, -i));
		}
		for (let i = this.spacing; i <= quadrantSize; i += this.spacing) {
			for (let j = this.spacing; j <= quadrantSize; j += this.spacing) {
				particles.push(this.createParticle(i, j));
				particles.push(this.createParticle(i, -j));
				particles.push(this.createParticle(-i, j));
				particles.push(this.createParticle(-i, -j));
			}
		}
		return particles;
	}
	addParticle(x, y) {
		this.particles.push(this.createParticle(x, y));
	}
	empty() {
		this.particles = [];
	}
	respawn() {
		this.particles = this.newParticles();
	}
	hasSpawningParticles() {
		return this.particles.some(particle => particle.new);
	}
	draw(force) {
		if (this.config.particle.mode === 'uniform') {
			this.drawUniformParticles();
			return;
		}
		this.drawMagnitudeParticles(force);
	}
	drawUniformParticles() {
		const context = this.p.drawingContext;
		const plane = this.getPlane();
		this.p.noStroke();
		this.p.fill(this.config.particle.color);
		context.beginPath();
		for (const particle of this.particles) {
			particle.updateDiameter();
			const x = plane.xToPixel(particle.x);
			const y = plane.yToPixel(particle.y);
			const radius = particle.diameter / 2;
			context.moveTo(x + radius, y);
			context.arc(x, y, radius, 0, this.p.TWO_PI);
		}
		context.fill();
	}
	drawMagnitudeParticles(force) {
		for (const bin of this.magnitudeBins) bin.length = 0;
		for (const particle of this.particles) {
			particle.updateDiameter();
			const sample = particle.evaluateField(force);
			const position = magnitudeColorPosition(sample.magnitude, force.maxMag);
			const binIndex = Math.min(magnitudeBinCount - 1, Math.floor(position * magnitudeBinCount));
			this.magnitudeBins[binIndex].push(particle);
		}

		const context = this.p.drawingContext;
		const plane = this.getPlane();
		const palette = this.getMagnitudePalette();
		this.p.noStroke();
		for (let index = 0; index < this.magnitudeBins.length; index++) {
			const bin = this.magnitudeBins[index];
			if (bin.length === 0) continue;
			this.p.fill(palette[index]);
			context.beginPath();
			for (const particle of bin) {
				const x = plane.xToPixel(particle.x);
				const y = plane.yToPixel(particle.y);
				const radius = particle.diameter / 2;
				context.moveTo(x + radius, y);
				context.arc(x, y, radius, 0, this.p.TWO_PI);
			}
			context.fill();
		}
	}
	getMagnitudePalette() {
		const { lowColor, highColor } = this.config.particle;
		if (this.magnitudePalette &&
			this.paletteLowColor === lowColor && this.paletteHighColor === highColor) {
			return this.magnitudePalette;
		}
		this.paletteLowColor = lowColor;
		this.paletteHighColor = highColor;
		this.magnitudePalette = Array.from(
			{ length: magnitudeBinCount },
			(_, index) => this.p.lerpColor(lowColor, highColor, index / (magnitudeBinCount - 1)),
		);
		return this.magnitudePalette;
	}
	invalidateFieldSamples() {
		for (let particle of this.particles) {
			particle.invalidateFieldSample();
		}
	}
	applyForce(force) {
		for (let particle of this.particles) {
			particle.applyForce(force);
		}
	}
	update() {
		// Remove particles that have flowed off the visible plane. Coordinates
		// are in world units (matching the viewport), so compare against the
		// viewport bounds plus a small margin.
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			if (p.x < this.viewport.x.min - 1 || p.x > this.viewport.x.max + 1 ||
				p.y < this.viewport.y.min - 1 || p.y > this.viewport.y.max + 1) {
				this.particles.splice(i, 1);
			}
		}
	}
}
