import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { StoreDefinition, PropertyInfo, MethodInfo } from '../models/store';

/**
 * Parser for JavaScript/TypeScript files containing store() calls
 */
export class JsStoreParser {
	/**
	 * Parse a JavaScript/TypeScript file and extract store definitions
	 */
	public parseFile(content: string, filePath: string): StoreDefinition[] {
		try {
			const ast = parse(content, {
				sourceType: 'module',
				plugins: ['jsx', 'typescript']
			});

			return this.extractStores(ast, filePath);
		} catch (error) {
			// If parsing fails, return empty array
			console.error('Error parsing JS file:', error);
			return [];
		}
	}

	/**
	 * Extract store definitions from JavaScript AST
	 */
	private extractStores(ast: any, filePath: string): StoreDefinition[] {
		const stores: StoreDefinition[] = [];

		// First pass: collect variable declarations for later resolution
		const variableDeclarations = new Map<string, any>();
		traverse(ast, {
			VariableDeclarator: (path: any) => {
				if (path.node.id.type === 'Identifier' && path.node.init) {
					variableDeclarations.set(path.node.id.name, path.node.init);
				}
			}
		});

		// Second pass: find store() calls
		traverse(ast, {
			CallExpression: (path: any) => {
				// Check if this is a store() call (with or without generics)
				if (
					path.node.callee.type === 'Identifier' &&
					path.node.callee.name === 'store'
				) {
					const store = this.parseStoreFromCall(path.node, filePath, variableDeclarations);
					if (store) {
						stores.push(store);
					}
				}
			}
		});

		return stores;
	}

	/**
	 * Parse store definition from a store() call
	 */
	private parseStoreFromCall(
		node: any,
		filePath: string,
		variableDeclarations: Map<string, any>
	): StoreDefinition | null {
		if (!node.arguments || node.arguments.length < 2) {
			return null;
		}

		// First argument is the namespace
		const namespaceArg = node.arguments[0];
		const namespace = this.extractStringValue(namespaceArg);
		if (!namespace) {
			return null;
		}

		// Second argument is the store object (could be inline or a variable reference)
		let storeArg = node.arguments[1];

		// If it's a variable reference, resolve it
		if (storeArg.type === 'Identifier') {
			const resolvedStore = variableDeclarations.get(storeArg.name);
			if (resolvedStore) {
				storeArg = resolvedStore;
			} else {
				console.log(`[WP Interactivity API] Could not resolve variable: ${storeArg.name}`);
				return null;
			}
		}

		if (storeArg.type !== 'ObjectExpression') {
			return null;
		}

		const state = new Map<string, PropertyInfo>();
		const actions = new Map<string, MethodInfo>();
		const callbacks = new Map<string, MethodInfo>();

		// Extract properties from the store object
		for (const prop of storeArg.properties) {
			if (prop.type !== 'ObjectProperty' && prop.type !== 'ObjectMethod') {
				continue;
			}

			const key = this.getPropertyKey(prop);
			if (!key) {
				continue;
			}

			switch (key) {
				case 'state':
					if (prop.value && prop.value.type === 'ObjectExpression') {
						this.extractStateProperties(prop.value, state);
					}
					break;
				case 'actions':
					if (prop.value && prop.value.type === 'ObjectExpression') {
						this.extractMethods(prop.value, actions);
					}
					break;
				case 'callbacks':
					if (prop.value && prop.value.type === 'ObjectExpression') {
						this.extractMethods(prop.value, callbacks);
					}
					break;
			}
		}

		return {
			namespace,
			state,
			actions,
			callbacks,
			sourceFile: filePath,
			sourceType: 'javascript',
			lastModified: Date.now()
		};
	}

	/**
	 * Extract string value from an AST node
	 */
	private extractStringValue(node: any): string | null {
		if (node.type === 'StringLiteral') {
			return node.value;
		}
		return null;
	}

	/**
	 * Get property key name
	 */
	private getPropertyKey(prop: any): string | null {
		if (prop.key.type === 'Identifier') {
			return prop.key.name;
		}
		if (prop.key.type === 'StringLiteral') {
			return prop.key.value;
		}
		return null;
	}

	/**
	 * Extract state properties from an object expression
	 */
	private extractStateProperties(
		node: any,
		state: Map<string, PropertyInfo>
	): void {
		for (const prop of node.properties) {
			// Handle ObjectProperty (regular properties)
			if (prop.type === 'ObjectProperty') {
				const key = this.getPropertyKey(prop);
				if (!key) {
					continue;
				}

				const propertyInfo: PropertyInfo = {
					name: key,
					type: this.inferType(prop.value),
					sourceLine: prop.loc?.start?.line
				};

				// Check if value is an object
				if (prop.value && prop.value.type === 'ObjectExpression') {
					propertyInfo.isObject = true;
					propertyInfo.properties = new Map();
					this.extractStateProperties(prop.value, propertyInfo.properties);
				}

				state.set(key, propertyInfo);
			}
			// Handle ObjectMethod (getters only - regular methods don't belong in state)
			else if (prop.type === 'ObjectMethod' && prop.kind === 'get') {
				const key = this.getPropertyKey(prop);
				if (!key) {
					continue;
				}

				const propertyInfo: PropertyInfo = {
					name: key,
					type: 'computed', // Mark as computed property
					sourceLine: prop.loc?.start?.line
				};

				state.set(key, propertyInfo);
			}
			// Skip other ObjectMethod types (regular methods, setters)
		}
	}

	/**
	 * Extract methods from an object expression
	 */
	private extractMethods(node: any, methods: Map<string, MethodInfo>): void {
		for (const prop of node.properties) {
			const key = this.getPropertyKey(prop);
			if (!key) {
				continue;
			}

			// Skip getters and setters in actions/callbacks
			if (prop.type === 'ObjectMethod' && (prop.kind === 'get' || prop.kind === 'set')) {
				continue;
			}

			const methodInfo: MethodInfo = {
				name: key,
				sourceLine: prop.loc?.start?.line
			};

			// Extract parameters if this is a function
			if (
				prop.value &&
				(prop.value.type === 'FunctionExpression' ||
					prop.value.type === 'ArrowFunctionExpression')
			) {
				methodInfo.parameters = prop.value.params.map((param: any) => {
					if (param.type === 'Identifier') {
						return param.name;
					}
					return 'param';
				});
			} else if (prop.type === 'ObjectMethod') {
				methodInfo.parameters = prop.params.map((param: any) => {
					if (param.type === 'Identifier') {
						return param.name;
					}
					return 'param';
				});
			}

			methods.set(key, methodInfo);
		}
	}

	/**
	 * Infer type from a JavaScript value node
	 */
	private inferType(node: any): string | undefined {
		if (!node) {
			return undefined;
		}

		switch (node.type) {
			case 'StringLiteral':
				return 'string';
			case 'NumericLiteral':
				return 'number';
			case 'BooleanLiteral':
				return 'boolean';
			case 'ArrayExpression':
				return 'array';
			case 'ObjectExpression':
				return 'object';
			case 'NullLiteral':
				return 'null';
			case 'ArrowFunctionExpression':
			case 'FunctionExpression':
				return 'function';
			default:
				return undefined;
		}
	}
}
