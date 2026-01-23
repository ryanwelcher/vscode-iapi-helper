import { PropertyInfo } from '../models/store';
import { Engine } from 'php-parser';

/**
 * Parser for inline data-wp-context attributes and wp_interactivity_data_wp_context() calls
 */
export class ContextParser {
	private phpParser: Engine;

	constructor() {
		this.phpParser = new Engine({
			parser: {
				extractDoc: true,
				suppressErrors: true
			},
			ast: {
				withPositions: true
			}
		});
	}
	/**
	 * Parse context properties from a data-wp-context attribute value
	 */
	public parseContextValue(value: string): Map<string, PropertyInfo> {
		const properties = new Map<string, PropertyInfo>();

		try {
			// Handle both single and double quotes
			// Also handle incomplete JSON during typing
			let jsonValue = value.trim();

			// If the value starts with a quote, try to remove it
			if (jsonValue.startsWith("'") || jsonValue.startsWith('"')) {
				jsonValue = jsonValue.substring(1);
			}

			// If the value ends with a quote, try to remove it
			if (jsonValue.endsWith("'") || jsonValue.endsWith('"')) {
				jsonValue = jsonValue.substring(0, jsonValue.length - 1);
			}

			// Try to parse as JSON
			// Use a tolerant approach for incomplete JSON
			const parsed = this.tolerantJsonParse(jsonValue);
			if (parsed) {
				this.extractProperties(parsed, properties);
			}
		} catch (error) {
			// If parsing fails, try to extract property names manually
			this.extractPropertyNamesManually(value, properties);
		}

		return properties;
	}

	/**
	 * Tolerant JSON parsing that handles incomplete JSON
	 */
	private tolerantJsonParse(value: string): any {
		try {
			// Try direct parse first
			return JSON.parse(value);
		} catch (error) {
			// Try to fix common issues with single-pass counting
			let fixed = value;

			// Count all bracket types in one pass
			const brackets = fixed.match(/[{}\[\]]/g) || [];
			let openBraces = 0;
			let closeBraces = 0;
			let openBrackets = 0;
			let closeBrackets = 0;

			for (const char of brackets) {
				if (char === '{') {
					openBraces++;
				} else if (char === '}') {
					closeBraces++;
				} else if (char === '[') {
					openBrackets++;
				} else if (char === ']') {
					closeBrackets++;
				}
			}

			// Add missing closing brackets
			if (openBraces > closeBraces) {
				fixed += '}'.repeat(openBraces - closeBraces);
			}
			if (openBrackets > closeBrackets) {
				fixed += ']'.repeat(openBrackets - closeBrackets);
			}

			// Try again
			try {
				return JSON.parse(fixed);
			} catch {
				return null;
			}
		}
	}

	/**
	 * Extract properties from parsed JSON object
	 */
	private extractProperties(
		obj: any,
		properties: Map<string, PropertyInfo>,
		prefix: string = ''
	): void {
		if (typeof obj !== 'object' || obj === null) {
			return;
		}

		for (const key in obj) {
			if (!obj.hasOwnProperty(key)) {
				continue;
			}

			const fullKey = prefix ? `${prefix}.${key}` : key;
			const value = obj[key];

			const propertyInfo: PropertyInfo = {
				name: fullKey,
				type: this.inferType(value)
			};

			// Check if value is an object
			if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
				propertyInfo.isObject = true;
				propertyInfo.properties = new Map();
				this.extractProperties(value, propertyInfo.properties, fullKey);
			}

			properties.set(key, propertyInfo);
		}
	}

	/**
	 * Extract property names manually from incomplete JSON
	 */
	private extractPropertyNamesManually(
		value: string,
		properties: Map<string, PropertyInfo>
	): void {
		// Match property names in JSON format: "propertyName":
		const propertyRegex = /["'](\w+)["']\s*:/g;
		let match;

		while ((match = propertyRegex.exec(value)) !== null) {
			const propertyName = match[1];
			properties.set(propertyName, {
				name: propertyName,
				type: 'unknown'
			});
		}
	}

	/**
	 * Infer type from a JavaScript value
	 */
	private inferType(value: any): string {
		if (value === null) {
			return 'null';
		}
		if (Array.isArray(value)) {
			return 'array';
		}
		return typeof value;
	}

	/**
	 * Parse all context attributes from a document
	 */
	public parseDocumentContexts(content: string): Map<string, PropertyInfo>[] {
		const contexts: Map<string, PropertyInfo>[] = [];

		// Find all data-wp-context attributes
		const contextRegex = /data-wp-context\s*=\s*(['"])([^'"]*)\1/g;
		let match;

		while ((match = contextRegex.exec(content)) !== null) {
			const contextValue = match[2];
			const properties = this.parseContextValue(contextValue);
			if (properties.size > 0) {
				contexts.push(properties);
			}
		}

		return contexts;
	}

	/**
	 * Parse context from wp_interactivity_data_wp_context() PHP function calls
	 */
	public parsePhpContextFunction(content: string): Map<string, PropertyInfo> | null {
		try {
			const ast = this.phpParser.parseCode(content, 'context.php');
			return this.extractContextFromPhp(ast);
		} catch (error) {
			console.error('[ContextParser] Error parsing PHP:', error);
			return null;
		}
	}

	/**
	 * Extract context from PHP AST
	 */
	private extractContextFromPhp(ast: any): Map<string, PropertyInfo> | null {
		let contextProperties: Map<string, PropertyInfo> | null = null;

		// First, collect all variable assignments
		const variableAssignments = new Map<string, any>();
		this.traversePhp(ast, (node: any) => {
			if (this.isVariableAssignment(node)) {
				const varName = this.getVariableName(node);
				if (varName) {
					variableAssignments.set(varName, node);
				}
			}
		});

		// Then find wp_interactivity_data_wp_context calls
		this.traversePhp(ast, (node: any) => {
			if (this.isWpInteractivityDataWpContextCall(node)) {
				const properties = this.parseContextFromPhpCall(node, variableAssignments);
				if (properties && properties.size > 0) {
					contextProperties = properties;
				}
			}
		});

		return contextProperties;
	}

	/**
	 * Check if a node is a wp_interactivity_data_wp_context function call
	 */
	private isWpInteractivityDataWpContextCall(node: any): boolean {
		return (
			node &&
			node.kind === 'call' &&
			node.what &&
			node.what.kind === 'name' &&
			node.what.name === 'wp_interactivity_data_wp_context'
		);
	}

	/**
	 * Parse context from a wp_interactivity_data_wp_context call
	 */
	private parseContextFromPhpCall(
		node: any,
		variableAssignments: Map<string, any>
	): Map<string, PropertyInfo> | null {
		if (!node.arguments || node.arguments.length === 0) {
			return null;
		}

		// The argument can be a variable reference or an array
		const contextArg = node.arguments[0];

		// If it's a variable, we need to find its definition
		if (contextArg.kind === 'variable') {
			console.log('[ContextParser] Context is passed as variable:', contextArg.name);
			const varName = contextArg.name;
			const assignment = variableAssignments.get(varName);

			if (assignment) {
				console.log('[ContextParser] Found variable assignment for:', varName);
				// Extract the value from the assignment
				const value = this.getAssignmentValue(assignment);
				if (value && (value.kind === 'array' || value.kind === 'new' || value.kind === 'call')) {
					// Handle array_merge() calls
					if (value.kind === 'call' && this.isFunctionCall(value, 'array_merge')) {
						console.log('[ContextParser] Found array_merge call');
						return this.parseArrayMergeCall(value);
					}
					return this.extractPropertiesFromPhpArray(value);
				}
			} else {
				console.log('[ContextParser] No assignment found for variable:', varName);
			}
			return null;
		}

		// If it's an array, parse it directly
		if (contextArg.kind === 'array' || contextArg.kind === 'new') {
			return this.extractPropertiesFromPhpArray(contextArg);
		}

		return null;
	}

	/**
	 * Check if a node is a variable assignment
	 */
	private isVariableAssignment(node: any): boolean {
		return (
			node &&
			node.kind === 'assign' &&
			node.left &&
			node.left.kind === 'variable'
		);
	}

	/**
	 * Get variable name from an assignment node
	 */
	private getVariableName(node: any): string | null {
		if (node.left && node.left.kind === 'variable') {
			return node.left.name;
		}
		return null;
	}

	/**
	 * Get the value being assigned in an assignment node
	 */
	private getAssignmentValue(node: any): any {
		return node.right || null;
	}

	/**
	 * Check if a node is a specific function call
	 */
	private isFunctionCall(node: any, functionName: string): boolean {
		return (
			node &&
			node.kind === 'call' &&
			node.what &&
			node.what.kind === 'name' &&
			node.what.name === functionName
		);
	}

	/**
	 * Parse array_merge() function call and extract all properties
	 */
	private parseArrayMergeCall(node: any): Map<string, PropertyInfo> {
		const properties = new Map<string, PropertyInfo>();

		if (!node.arguments || node.arguments.length === 0) {
			return properties;
		}

		// Process each argument to array_merge
		for (const arg of node.arguments) {
			if (arg.kind === 'array' || arg.kind === 'new') {
				const argProperties = this.extractPropertiesFromPhpArray(arg);
				// Merge properties (later arrays override earlier ones)
				for (const [key, value] of argProperties.entries()) {
					properties.set(key, value);
				}
			}
		}

		return properties;
	}

	/**
	 * Extract properties from a PHP array AST node
	 */
	private extractPropertiesFromPhpArray(node: any): Map<string, PropertyInfo> {
		const properties = new Map<string, PropertyInfo>();

		if (!node || (node.kind !== 'array' && node.kind !== 'new')) {
			return properties;
		}

		const items = node.items || [];

		for (const item of items) {
			if (item && item.kind === 'entry') {
				let key: string | null = null;

				if (item.key) {
					if (item.key.kind === 'string') {
						key = item.key.value;
					} else if (item.key.kind === 'identifier') {
						key = item.key.name;
					}
				}

				if (key) {
					const propertyInfo: PropertyInfo = {
						name: key,
						type: this.inferPhpType(item.value),
						sourceLine: item.loc?.start?.line
					};

					// Check if value is an array/object
					if (item.value && (item.value.kind === 'array' || item.value.kind === 'new')) {
						propertyInfo.isObject = true;
						propertyInfo.properties = this.extractPropertiesFromPhpArray(item.value);
					}

					properties.set(key, propertyInfo);
				}
			}
		}

		return properties;
	}

	/**
	 * Infer type from a PHP value node
	 */
	private inferPhpType(node: any): string | undefined {
		if (!node) {
			return undefined;
		}

		switch (node.kind) {
			case 'string':
				return 'string';
			case 'number':
				return 'number';
			case 'boolean':
				return 'boolean';
			case 'array':
			case 'new':
				return 'array';
			case 'nullkeyword':
				return 'null';
			default:
				return undefined;
		}
	}

	/**
	 * Traverse PHP AST recursively
	 */
	private traversePhp(node: any, callback: (node: any) => void): void {
		if (!node || typeof node !== 'object') {
			return;
		}

		callback(node);

		// Traverse children
		for (const key in node) {
			if (node.hasOwnProperty(key)) {
				const child = node[key];
				if (Array.isArray(child)) {
					for (const item of child) {
						this.traversePhp(item, callback);
					}
				} else if (typeof child === 'object') {
					this.traversePhp(child, callback);
				}
			}
		}
	}

	/**
	 * Parse context from document text, looking for both inline attributes and PHP function calls
	 */
	public parseContextFromDocument(content: string, position: number): Map<string, PropertyInfo> | null {
		// First, try to find wp_interactivity_data_wp_context() function call near the position
		const textBefore = content.substring(0, position);

		// Look for the function call pattern
		const funcCallRegex = /wp_interactivity_data_wp_context\s*\(\s*\$/g;
		let match;
		let lastMatch: RegExpExecArray | null = null;

		while ((match = funcCallRegex.exec(textBefore)) !== null) {
			lastMatch = match;
		}

		if (lastMatch) {
			// Found a function call, try to parse the PHP
			const phpContext = this.parsePhpContextFunction(content);
			if (phpContext && phpContext.size > 0) {
				console.log('[ContextParser] Found context from wp_interactivity_data_wp_context()');
				return phpContext;
			}
		}

		// Fallback to inline context attributes
		const contexts = this.parseDocumentContexts(textBefore);
		if (contexts.length > 0) {
			return contexts[contexts.length - 1];
		}

		return null;
	}
}
