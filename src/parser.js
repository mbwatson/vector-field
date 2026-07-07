// Self-contained math expression parser for user-entered vector field
// components. It parses a string like "y^3 - 9y" or "2 sin(x) cos(y)" into:
//   - fn:    a native (x, y) => number function (fast enough to run per frame)
//   - latex: a LaTeX string for display via MathJax
//
// Supported: + - * / ^, parentheses, unary minus, implicit multiplication
// (e.g. 3x, xy, 2sin(x), (x+1)(x-1)), the variables x and y, the constants
// pi and e, and functions: sin cos tan sec csc cot asin/arcsin acos/arccos
// atan/arctan sinh cosh tanh exp ln log sqrt abs.
//
// parseFunction(str) returns { fn, latex } or throws an Error with a message
// suitable for showing to the user.
	const FUNCS = {
		sin: Math.sin, cos: Math.cos, tan: Math.tan,
		sec: (v) => 1 / Math.cos(v), csc: (v) => 1 / Math.sin(v), cot: (v) => 1 / Math.tan(v),
		asin: Math.asin, acos: Math.acos, atan: Math.atan,
		sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
		exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs,
		ln: Math.log, log: Math.log10,
	};
	const FUNC_ALIASES = { arcsin: 'asin', arccos: 'acos', arctan: 'atan' };
	const CONSTS = { pi: Math.PI, e: Math.E };

	// Reserved words, matched longest-first so e.g. "sin" wins over "s".
	const RESERVED = Object.keys(FUNCS)
		.concat(Object.keys(FUNC_ALIASES), Object.keys(CONSTS))
		.sort((a, b) => b.length - a.length);

	const isLetter = (c) => (c >= 'a' && c <= 'z');
	const isDigit = (c) => (c >= '0' && c <= '9');

	function tokenText(t) {
		if (!t) return 'end of input';
		if (t.type === 'num') return String(t.value);
		if (t.type === 'op') return t.op;
		if (t.type === 'lparen') return '(';
		if (t.type === 'rparen') return ')';
		return t.name;
	}

	// Break a run of letters into function/constant/variable tokens, allowing
	// implicit multiplication (e.g. "xy" -> x, y; "2pi" handled by the caller).
	function readLetters(run) {
		const tokens = [];
		let i = 0;
		while (i < run.length) {
			let matched = null;
			for (const w of RESERVED) {
				if (run.startsWith(w, i)) { matched = w; break; }
			}
			if (matched) {
				if (CONSTS.hasOwnProperty(matched)) {
					tokens.push({ type: 'const', name: matched });
				} else {
					tokens.push({ type: 'func', name: FUNC_ALIASES[matched] || matched });
				}
				i += matched.length;
			} else {
				const ch = run[i];
				if (ch === 'x' || ch === 'y') {
					tokens.push({ type: 'var', name: ch });
					i += 1;
				} else {
					throw new Error(`Unknown symbol "${ch}". Use x, y, numbers, + - * / ^ and functions like sin, cos, sqrt.`);
				}
			}
		}
		return tokens;
	}

	function tokenize(str) {
		const tokens = [];
		let i = 0;
		while (i < str.length) {
			const c = str[i];
			if (c === ' ' || c === '\t') { i += 1; continue; }
			if (isDigit(c) || c === '.') {
				let j = i;
				while (j < str.length && (isDigit(str[j]) || str[j] === '.')) j += 1;
				const numStr = str.slice(i, j);
				if ((numStr.match(/\./g) || []).length > 1 || !/[0-9]/.test(numStr)) {
					throw new Error(`Invalid number "${numStr}".`);
				}
				tokens.push({ type: 'num', value: parseFloat(numStr) });
				i = j;
			} else if (isLetter(c)) {
				let j = i;
				while (j < str.length && isLetter(str[j])) j += 1;
				for (const t of readLetters(str.slice(i, j))) tokens.push(t);
				i = j;
			} else if ('+-*/^'.indexOf(c) !== -1) {
				tokens.push({ type: 'op', op: c });
				i += 1;
			} else if (c === '(') {
				tokens.push({ type: 'lparen' });
				i += 1;
			} else if (c === ')') {
				tokens.push({ type: 'rparen' });
				i += 1;
			} else {
				throw new Error(`Unexpected character "${c}".`);
			}
		}
		return tokens;
	}

	// Recursive-descent parser producing an AST. Precedence, low to high:
	// (+ -), (* / and implicit), unary -, ^ (right associative), primary.
	function parse(tokens) {
		let pos = 0;
		const peek = () => tokens[pos];
		const next = () => tokens[pos++];
		const isFactorStart = (t) => t && (t.type === 'num' || t.type === 'var'
			|| t.type === 'const' || t.type === 'func' || t.type === 'lparen');

		function parseExpression() {
			let node = parseTerm();
			while (peek() && peek().type === 'op' && (peek().op === '+' || peek().op === '-')) {
				const op = next().op;
				node = { type: 'binop', op, left: node, right: parseTerm() };
			}
			return node;
		}

		function parseTerm() {
			let node = parseUnary();
			while (true) {
				const t = peek();
				if (t && t.type === 'op' && (t.op === '*' || t.op === '/')) {
					const op = next().op;
					node = { type: 'binop', op, left: node, right: parseUnary() };
				} else if (isFactorStart(t)) {
					node = { type: 'binop', op: '*', left: node, right: parseUnary() };
				} else {
					break;
				}
			}
			return node;
		}

		function parseUnary() {
			const t = peek();
			if (t && t.type === 'op' && (t.op === '-' || t.op === '+')) {
				next();
				const arg = parseUnary();
				return t.op === '-' ? { type: 'neg', arg } : arg;
			}
			return parsePower();
		}

		function parsePower() {
			const base = parsePrimary();
			const t = peek();
			if (t && t.type === 'op' && t.op === '^') {
				next();
				return { type: 'pow', base, exp: parseUnary() };
			}
			return base;
		}

		function parsePrimary() {
			const t = peek();
			if (!t) throw new Error('Unexpected end of expression.');
			if (t.type === 'num') { next(); return { type: 'num', value: t.value }; }
			if (t.type === 'var') { next(); return { type: 'var', name: t.name }; }
			if (t.type === 'const') { next(); return { type: 'const', name: t.name }; }
			if (t.type === 'func') {
				next();
				if (!peek() || peek().type !== 'lparen') throw new Error(`Expected "(" after ${t.name}.`);
				next();
				const arg = parseExpression();
				if (!peek() || peek().type !== 'rparen') throw new Error(`Expected ")" to close ${t.name}(...).`);
				next();
				return { type: 'call', name: t.name, arg };
			}
			if (t.type === 'lparen') {
				next();
				const inner = parseExpression();
				if (!peek() || peek().type !== 'rparen') throw new Error('Missing closing ")".');
				next();
				return inner;
			}
			throw new Error(`Unexpected "${tokenText(t)}".`);
		}

		const node = parseExpression();
		if (pos < tokens.length) throw new Error(`Unexpected "${tokenText(peek())}".`);
		return node;
	}

	// Compile an AST into a fast native (x, y) => number closure.
	function compile(node) {
		switch (node.type) {
			case 'num': { const v = node.value; return () => v; }
			case 'var': return node.name === 'x' ? (x) => x : (x, y) => y;
			case 'const': { const v = CONSTS[node.name]; return () => v; }
			case 'neg': { const a = compile(node.arg); return (x, y) => -a(x, y); }
			case 'pow': {
				const b = compile(node.base);
				const e = compile(node.exp);
				return (x, y) => Math.pow(b(x, y), e(x, y));
			}
			case 'call': {
				const a = compile(node.arg);
				const fn = FUNCS[node.name];
				return (x, y) => fn(a(x, y));
			}
			case 'binop': {
				const l = compile(node.left);
				const r = compile(node.right);
				switch (node.op) {
					case '+': return (x, y) => l(x, y) + r(x, y);
					case '-': return (x, y) => l(x, y) - r(x, y);
					case '*': return (x, y) => l(x, y) * r(x, y);
					case '/': return (x, y) => l(x, y) / r(x, y);
				}
			}
		}
		throw new Error('Cannot compile expression.');
	}

	function nodePrec(n) {
		if (n.type === 'binop') return (n.op === '+' || n.op === '-') ? 1 : 2;
		if (n.type === 'neg') return 3;
		if (n.type === 'pow') return 4;
		return 10;
	}

	function funcLatex(node, argStr) {
		switch (node.name) {
			case 'sqrt': return `\\sqrt{${argStr}}`;
			case 'abs': return `\\left|${argStr}\\right|`;
			case 'exp': return `e^{${argStr}}`;
			case 'asin': return `\\arcsin\\left(${argStr}\\right)`;
			case 'acos': return `\\arccos\\left(${argStr}\\right)`;
			case 'atan': return `\\arctan\\left(${argStr}\\right)`;
			case 'ln': return `\\ln\\left(${argStr}\\right)`;
			case 'log': return `\\log\\left(${argStr}\\right)`;
			default: return `\\${node.name}\\left(${argStr}\\right)`;
		}
	}

	function toLatex(node) {
		switch (node.type) {
			case 'num': return String(node.value);
			case 'var': return node.name;
			case 'const': return node.name === 'pi' ? '\\pi' : 'e';
			case 'neg': {
				const inner = toLatex(node.arg);
				return '-' + (nodePrec(node.arg) <= 1 ? `\\left(${inner}\\right)` : inner);
			}
			case 'pow': {
				const b = toLatex(node.base);
				const baseStr = nodePrec(node.base) < 10 ? `\\left(${b}\\right)` : b;
				return `${baseStr}^{${toLatex(node.exp)}}`;
			}
			case 'call': return funcLatex(node, toLatex(node.arg));
			case 'binop': {
				if (node.op === '/') {
					return `\\frac{${toLatex(node.left)}}{${toLatex(node.right)}}`;
				}
				if (node.op === '*') {
					const l = toLatex(node.left);
					const r = toLatex(node.right);
					const ls = nodePrec(node.left) < 2 ? `\\left(${l}\\right)` : l;
					const rs = nodePrec(node.right) < 2 ? `\\left(${r}\\right)` : r;
					const sep = node.right.type === 'num' ? ' \\cdot ' : ' ';
					return ls + sep + rs;
				}
				const l = toLatex(node.left);
				const r = toLatex(node.right);
				const rs = (node.op === '-' && nodePrec(node.right) <= 1) ? `\\left(${r}\\right)` : r;
				return `${l} ${node.op} ${rs}`;
			}
		}
		return '';
	}

	function parseFunction(str) {
		if (!str || !str.trim()) throw new Error('Enter an expression.');
		const tokens = tokenize(str.toLowerCase());
		if (tokens.length === 0) throw new Error('Enter an expression.');
		const ast = parse(tokens);
		const fn = compile(ast);
		if (typeof fn(1, 1) !== 'number') throw new Error('Expression did not evaluate to a number.');
		return { fn, latex: toLatex(ast) };
	}

export { parseFunction };
