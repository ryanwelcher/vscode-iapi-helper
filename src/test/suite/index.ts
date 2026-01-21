import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';

function findTestFiles(dir: string): string[] {
	const files: string[] = [];

	function walk(directory: string) {
		if (!fs.existsSync(directory)) {
			return;
		}

		const entries = fs.readdirSync(directory, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(directory, entry.name);

			if (entry.isDirectory()) {
				walk(fullPath);
			} else if (entry.name.endsWith('.test.js')) {
				files.push(fullPath);
			}
		}
	}

	walk(dir);
	return files;
}

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 10000
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		try {
			const files = findTestFiles(testsRoot);

			if (files.length === 0) {
				console.log('No test files found');
				return resolve();
			}

			// Add files to the test suite
			files.forEach((f: string) => mocha.addFile(f));

			// Run the mocha test
			mocha.run((failures: number) => {
				if (failures > 0) {
					reject(new Error(`${failures} tests failed.`));
				} else {
					resolve();
				}
			});
		} catch (err) {
			console.error('Error running tests:', err);
			reject(err);
		}
	});
}
