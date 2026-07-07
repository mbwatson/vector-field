export const particleBenchmarkScenarios = [
	{ name: '500 paused uniform', particleCount: 500, paused: true, colorMode: 'uniform', field: ['-y', 'x'] },
	{ name: '2500 paused uniform', particleCount: 2500, paused: true, colorMode: 'uniform', field: ['-y', 'x'] },
	{ name: '5000 paused uniform', particleCount: 5000, paused: true, colorMode: 'uniform', field: ['-y', 'x'] },
	{ name: '2500 running uniform polynomial', particleCount: 2500, paused: false, colorMode: 'uniform', field: ['-y', 'x'] },
	{ name: '2500 running magnitude polynomial', particleCount: 2500, paused: false, colorMode: 'magnitude', field: ['-y', 'x'] },
	{ name: '2500 running magnitude trigonometric', particleCount: 2500, paused: false, colorMode: 'magnitude', field: ['sin(x + y)', 'cos(x*y)'] },
];
