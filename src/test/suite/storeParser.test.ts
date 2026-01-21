import * as assert from 'assert';
import { JsStoreParser } from '../../parsers/jsStoreParser';
import { PhpStoreParser } from '../../parsers/phpStoreParser';

suite('Store Parser Test Suite', () => {
	suite('JavaScript Store Parser', () => {
		const parser = new JsStoreParser();

		test('Should parse inline store definition', () => {
			const content = `
import { store } from '@wordpress/interactivity';

store('my-store', {
	state: {
		counter: 0,
		isOpen: false
	},
	actions: {
		increment() {},
		toggle() {}
	},
	callbacks: {
		onInit() {}
	}
});
			`;

			const stores = parser.parseFile(content, 'test.js');

			assert.strictEqual(stores.length, 1);
			assert.strictEqual(stores[0].namespace, 'my-store');
			assert.strictEqual(stores[0].state.size, 2);
			assert.strictEqual(stores[0].actions.size, 2);
			assert.strictEqual(stores[0].callbacks.size, 1);
		});

		test('Should parse variable reference store definition', () => {
			const content = `
import { store } from '@wordpress/interactivity';

const myStore = {
	state: {
		value: 'test'
	},
	actions: {
		doSomething() {}
	},
	callbacks: {}
};

store('my-store', myStore);
			`;

			const stores = parser.parseFile(content, 'test.ts');

			assert.strictEqual(stores.length, 1);
			assert.strictEqual(stores[0].namespace, 'my-store');
			assert.strictEqual(stores[0].state.size, 1);
			assert.ok(stores[0].state.has('value'));
		});

		test('Should parse TypeScript store with generics', () => {
			const content = `
import { store } from '@wordpress/interactivity';

type MyStore = {
	state: {
		typed: string;
	};
};

const storeObj = {
	state: {
		typed: 'value'
	},
	actions: {},
	callbacks: {}
};

const { state } = store<MyStore>('my-store', storeObj);
			`;

			const stores = parser.parseFile(content, 'test.ts');

			assert.strictEqual(stores.length, 1);
			assert.strictEqual(stores[0].namespace, 'my-store');
			assert.ok(stores[0].state.has('typed'));
		});
	});

	suite('PHP Store Parser', () => {
		const parser = new PhpStoreParser();

		test('Should parse wp_interactivity_state', () => {
			const content = `
<?php
wp_interactivity_state('my-store', array(
	'counter' => 0,
	'isOpen' => false,
	'message' => 'Hello'
));
			`;

			const stores = parser.parseFile(content, 'test.php');

			assert.strictEqual(stores.length, 1);
			assert.strictEqual(stores[0].namespace, 'my-store');
			assert.strictEqual(stores[0].state.size, 3);
			assert.ok(stores[0].state.has('counter'));
			assert.ok(stores[0].state.has('isOpen'));
			assert.ok(stores[0].state.has('message'));
		});

		test('Should parse short array syntax', () => {
			const content = `
<?php
wp_interactivity_state('short-array', [
	'value' => 'test'
]);
			`;

			const stores = parser.parseFile(content, 'test.php');

			assert.strictEqual(stores.length, 1);
			assert.strictEqual(stores[0].state.size, 1);
		});
	});
});
