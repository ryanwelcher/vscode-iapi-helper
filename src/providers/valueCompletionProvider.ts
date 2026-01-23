import * as vscode from 'vscode';
import { StoreRegistry } from '../parsers/storeParser';
import { DocumentParser } from '../utils/documentParser';
import { HtmlParser } from '../utils/htmlParser';
import { StoreDefinition, PropertyInfo } from '../models/store';
import { ContextParser } from '../parsers/contextParser';

/**
 * Completion provider for directive values (state, context, actions, callbacks)
 */
export class ValueCompletionProvider implements vscode.CompletionItemProvider {
	private contextParser: ContextParser;

	constructor(private registry: StoreRegistry) {
		this.contextParser = new ContextParser();
	}

	/**
	 * Provide completion items
	 */
	public provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken,
		_context: vscode.CompletionContext
	): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		// Check if completions are enabled
		const config = vscode.workspace.getConfiguration('wpInteractivityAPI');
		if (!config.get<boolean>('enableValueCompletion', true)) {
			return [];
		}

		// Check if we're in HTML context (not inside PHP tags)
		const langContext = DocumentParser.getLanguageContext(document, position);
		if (langContext === 'php') {
			return [];
		}

		// Check if we're in an attribute value position
		if (!HtmlParser.isInAttributeValue(document, position)) {
			return [];
		}

		// Get the current attribute name to ensure it's a directive
		const attrName = HtmlParser.getAttributeNameAtPosition(document, position);
		if (!attrName || !attrName.startsWith('data-wp-')) {
			return [];
		}

		// Get the current value being typed
		const currentValue = DocumentParser.getCurrentAttributeValue(document, position);

		// Parse the value to understand what to suggest
		const valueInfo = DocumentParser.parseValuePrefix(currentValue);

		// Special handling for context. - check for inline data-wp-context first
		if (valueInfo.type === 'context') {
			console.log('[WP Interactivity API] Context type detected, looking for inline context...');

			// First, try to find context from PHP function calls
			const docText = document.getText();
			const offset = document.offsetAt(position);
			const phpContext = this.contextParser.parseContextFromDocument(docText, offset);

			if (phpContext && phpContext.size > 0) {
				console.log('[WP Interactivity API] Context from PHP function found, properties:', phpContext.size);
				return this.getContextSuggestions(phpContext, valueInfo.prefix, 'wp_interactivity_data_wp_context()');
			}

			// Fallback to inline HTML attributes
			const inlineContext = HtmlParser.findNearestContextAttribute(document, position);
			console.log('[WP Interactivity API] Inline context found:', inlineContext);
			if (inlineContext) {
				const contextProperties = this.contextParser.parseContextValue(inlineContext);
				console.log('[WP Interactivity API] Context properties parsed:', contextProperties.size, 'properties');
				if (contextProperties.size > 0) {
					console.log('[WP Interactivity API] Returning context suggestions');
					return this.getContextSuggestions(contextProperties, valueInfo.prefix, inlineContext);
				}
			}
		}

		// Find the namespace from the nearest data-wp-interactive
		const namespace = valueInfo.namespace || DocumentParser.findNearestNamespace(document, position);

		console.log('[WP Interactivity API] Value completion - namespace:', namespace, 'type:', valueInfo.type, 'prefix:', valueInfo.prefix);

		if (!namespace) {
			// Suggest basic prefixes if no namespace found
			console.log('[WP Interactivity API] No namespace found, suggesting basic prefixes');
			return this.suggestBasicPrefixes(currentValue);
		}

		// Get the store for this namespace
		const store = this.registry.getStore(namespace);
		console.log('[WP Interactivity API] Store lookup result:', store ? 'found' : 'not found');

		if (!store) {
			// Also check for inline context store
			const inlineStore = this.registry.getStore('_inline_context_');
			if (!inlineStore) {
				console.log('[WP Interactivity API] No store found for namespace:', namespace);
				const allStores = this.registry.getAllStores();
				console.log('[WP Interactivity API] Available stores:', allStores.map(s => s.namespace));
				return this.suggestBasicPrefixes(currentValue);
			}
			return this.getSuggestions(inlineStore, valueInfo.type, valueInfo.prefix);
		}

		// Get suggestions based on the type and prefix
		return this.getSuggestions(store, valueInfo.type, valueInfo.prefix);
	}

	/**
	 * Suggest basic prefixes (state, context, actions, callbacks)
	 */
	private suggestBasicPrefixes(currentValue: string): vscode.CompletionItem[] {
		const prefixes = ['state', 'context', 'actions', 'callbacks'];

		return prefixes
			.filter(prefix => prefix.startsWith(currentValue))
			.map(prefix => {
				const item = new vscode.CompletionItem(prefix, vscode.CompletionItemKind.Module);
				item.detail = `[WordPress Interactivity API] ${prefix}`;
				item.insertText = new vscode.SnippetString(`${prefix}.$1`);
				return item;
			});
	}

	/**
	 * Get suggestions based on store and type
	 */
	private getSuggestions(
		store: StoreDefinition,
		type: 'state' | 'context' | 'actions' | 'callbacks' | 'namespace' | null,
		prefix: string
	): vscode.CompletionItem[] {
		const items: vscode.CompletionItem[] = [];

		// If no type yet, suggest the prefixes
		if (type === null) {
			return this.suggestBasicPrefixes(prefix);
		}

		// Get the appropriate map based on type
		let sourceMap: Map<string, any>;
		let itemKind: vscode.CompletionItemKind;

		switch (type) {
			case 'state':
				sourceMap = store.state;
				itemKind = vscode.CompletionItemKind.Property;
				break;
			case 'context':
				// Context is handled separately - inline context takes precedence
				// If we're here, no inline context was found, fall back to store
				sourceMap = store.state;
				itemKind = vscode.CompletionItemKind.Property;
				break;
			case 'actions':
				sourceMap = store.actions;
				itemKind = vscode.CompletionItemKind.Method;
				break;
			case 'callbacks':
				sourceMap = store.callbacks;
				itemKind = vscode.CompletionItemKind.Function;
				break;
			default:
				return [];
		}

		// Filter and create completion items
		for (const [name, info] of sourceMap.entries()) {
			if (!prefix || name.startsWith(prefix)) {
				const item = new vscode.CompletionItem(name, itemKind);

				// Add type information if available
				if ('type' in info && info.type) {
					item.detail = `(${info.type}) ${type}.${name}`;
				} else {
					item.detail = `${type}.${name}`;
				}

				// Add parameter information for methods
				if ('parameters' in info && info.parameters) {
					const params = info.parameters.join(', ');
					item.detail += ` (${params})`;
				}

				// Documentation
				item.documentation = new vscode.MarkdownString(
					`**${type}.${name}**\n\nFrom store: \`${store.namespace}\``
				);

				if ('sourceLine' in info && info.sourceLine) {
					item.documentation.appendMarkdown(
						`\n\nDefined in: ${store.sourceFile}:${info.sourceLine}`
					);
				}

				items.push(item);
			}
		}

		return items;
	}

	/**
	 * Get suggestions for inline context properties
	 */
	private getContextSuggestions(
		properties: Map<string, PropertyInfo>,
		prefix: string,
		contextValue: string
	): vscode.CompletionItem[] {
		const items: vscode.CompletionItem[] = [];

		for (const [name, info] of properties.entries()) {
			if (!prefix || name.startsWith(prefix)) {
				const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property);

				// Add type information
				if (info.type) {
					item.detail = `(${info.type}) context.${name}`;
				} else {
					item.detail = `context.${name}`;
				}

				// Documentation
				item.documentation = new vscode.MarkdownString(
					`**context.${name}**\n\nFrom inline data-wp-context: \`${contextValue}\``
				);

				items.push(item);
			}
		}

		return items;
	}

	/**
	 * Resolve completion item
	 */
	public resolveCompletionItem(
		item: vscode.CompletionItem,
		_token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}
}
