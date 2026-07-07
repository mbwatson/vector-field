import { describe, expect, it } from 'vitest';
import { parseFunction } from './parser.js';

describe('parseFunction', () => {
	it('observes arithmetic precedence and evaluates coordinates', () => {
		expect(parseFunction('2 + 3*x^2').fn(2, 0)).toBe(14);
		expect(parseFunction('(2 + 3)*x^2').fn(2, 0)).toBe(20);
	});

	it('handles unary operations and right-associative exponentiation', () => {
		expect(parseFunction('-2^2').fn(0, 0)).toBe(-4);
		expect(parseFunction('2^-2').fn(0, 0)).toBe(0.25);
		expect(parseFunction('2^3^2').fn(0, 0)).toBe(512);
	});

	it('supports implicit multiplication', () => {
		expect(parseFunction('2x(y+1)').fn(2, 4)).toBe(20);
		expect(parseFunction('xy + 2sin(x)').fn(Math.PI / 2, 2)).toBeCloseTo(Math.PI + 2);
	});

	it('supports function aliases and constants', () => {
		expect(parseFunction('arcsin(x) + arccos(x)').fn(0.5, 0)).toBeCloseTo(Math.PI / 2);
		expect(parseFunction('ln(e) + log(100)').fn(0, 0)).toBeCloseTo(3);
	});

	it.each([
		['', 'Enter an expression'],
		['x +', 'Unexpected end'],
		['sin x', 'Expected "("'],
		['z', 'Unknown symbol'],
		['1..2', 'Invalid number'],
	])('rejects malformed expression %j', (expression, message) => {
		expect(() => parseFunction(expression)).toThrow(message);
	});

	it('generates readable LaTeX', () => {
		expect(parseFunction('(x+1)/sqrt(y)').latex).toBe('\\frac{x + 1}{\\sqrt{y}}');
		expect(parseFunction('arctan(x) + pi').latex).toBe('\\arctan\\left(x\\right) + \\pi');
	});
});
