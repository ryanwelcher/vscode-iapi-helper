# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VSCode extension providing intelligent autocomplete and validation for WordPress Interactivity API directives in PHP and HTML files. The extension parses store definitions from PHP (`wp_interactivity_state`) and JavaScript/TypeScript (`store()`) to provide context-aware suggestions.

## Development Commands

```bash
# Initial setup
npm install

# Development
npm run watch           # Auto-recompile on changes
npm run compile         # Single build (development mode)

# Testing
# Press F5 in VSCode to launch Extension Development Host

# Production build
npm run package         # Production build with minification

# Linting
npm run lint

# Packaging for distribution
npm run vsce:package    # Creates .vsix file
npm run install-extension  # Package and install locally
```

## Architecture Overview

### Core Design Principles

1. **Directory-Scoped Scanning**: Only scans files in the active document's directory (not entire workspace) for performance
2. **Pre-built Completions**: Static directive completions are built once in provider constructors
3. **Tolerant Parsing**: Handles incomplete HTML/JSON during user typing
4. **AST-Based Parsing**: Uses php-parser, @babel/parser, and node-html-parser (no regex parsing)

### Data Flow

```
User opens PHP/HTML file
    ↓
WorkspaceScanner scans same directory for store files
    ↓
PhpStoreParser + JsStoreParser extract state/actions/callbacks
    ↓
StoreRegistry caches parsed stores (HashMap for O(1) lookup)
    ↓
User types "data-" → DirectiveCompletionProvider suggests directives
User types "state." → ValueCompletionProvider queries StoreRegistry
    ↓
DuplicateValidator + NamespaceValidator provide warnings
```

### Key Components

#### Providers (`src/providers/`)
- **DirectiveCompletionProvider**: Suggests `data-wp-*` directives when user types `data-`
- **ValueCompletionProvider**: Suggests property access (e.g., `state.counter`, `actions.toggle`)

#### Parsers (`src/parsers/`)
- **PhpStoreParser**: Extracts stores from `wp_interactivity_state('namespace', array(...))` calls
- **JsStoreParser**: Extracts stores from `store('namespace', { state, actions, callbacks })` calls
- **ContextParser**: Parses inline `data-wp-context='{"prop": value}'` attributes
- **StoreRegistry**: Central cache for all detected stores (HashMap-based)

#### Validators (`src/validators/`)
- **DuplicateValidator**: Detects duplicate directives on same element (based on rules in `directives.ts`)
- **NamespaceValidator**: Warns about undefined namespaces with typo suggestions

#### Utilities (`src/utils/`)
- **WorkspaceScanner**: Directory-scoped file discovery and parsing coordinator
- **HtmlParser**: HTML parsing utilities (tolerant mode, handles incomplete markup)
- **DocumentParser**: Language context detection (HTML vs PHP tags)

#### Constants (`src/constants/`)
- **directives.ts**: Source of truth for all 21 directives with metadata (category, duplication rules, documentation, snippets)

## Critical Implementation Details

### Store Detection Rules

**JavaScript/TypeScript Files:**
- Must contain direct `store('namespace', {...})` call (not assigned to variable for detection)
- Variable references with generics like `store<Type>('namespace', storeVar)` ARE detected
- Files: Scans all `.js`, `.ts`, `.jsx`, `.tsx` in same directory

**PHP Files:**
- Looks for `wp_interactivity_state('namespace', array(...))` function calls
- Handles both array syntax: `array(...)` and `[...]`

**Inline Context:**
- Parses `data-wp-context='{"prop": value}'` attributes for context property suggestions
- Must be valid JSON (tolerant parsing during typing)

### Provider Behavior

**DirectiveCompletionProvider:**
1. Checks configuration: `wpInteractivityAPI.enableDirectiveCompletion`
2. Validates language context (not inside PHP tags: `<?php ?>`)
3. Checks cursor is in HTML attribute name position
4. Filters directives already present on element
5. Returns pre-built completion items with snippets

**ValueCompletionProvider:**
1. Checks configuration: `wpInteractivityAPI.enableValueCompletion`
2. Validates language context
3. Detects reference type: `state.`, `context.`, `actions.`, `callbacks.`
4. Finds namespace from `data-wp-interactive` attribute
5. Queries StoreRegistry for matching properties
6. Returns completion items

### Duplicate Detection Rules

Defined in `src/constants/directives.ts` for each directive:
- **allowDuplicates: false** - One per element (e.g., `data-wp-text`)
- **allowDuplicates: true** - Multiple with unique IDs (e.g., `data-wp-on--click` different events)
- **allowDuplicates: 'unique-id'** - Multiple with same base but unique suffix (e.g., `data-wp-bind--href`, `data-wp-bind--class`)

### Performance Targets

- Completion suggestions: <100ms (achieved via pre-built items + HashMap lookups)
- Directory scanning: <500ms (achieved via directory-scoping)
- Memory: <50MB per directory (typical)

## Code Patterns

### Adding a New Directive

1. Add to `DIRECTIVES` array in `src/constants/directives.ts`:
```typescript
{
    name: 'data-wp-example',
    displayName: 'data-wp-example',
    category: DirectiveCategory.Core,
    allowDuplicates: false,
    documentation: 'Description from WordPress docs',
    snippet: 'data-wp-example="$1"',
    referenceUrl: 'https://developer.wordpress.org/...'
}
```

2. Test in Extension Development Host (F5)

### Parser Pattern (Never Throw)

```typescript
public parseFile(content: string, filePath: string): StoreDefinition[] {
    try {
        const ast = this.parser.parseCode(content);
        return this.extractStores(ast, filePath);
    } catch (error) {
        console.error('[Parser] Error:', error);
        return []; // Always return array, never throw
    }
}
```

### Provider Pattern (Configuration-First)

```typescript
public provideCompletionItems(...): vscode.CompletionItem[] {
    // 1. Check configuration
    const config = vscode.workspace.getConfiguration('wpInteractivityAPI');
    if (!config.get<boolean>('enableFeature', true)) {
        return [];
    }

    // 2. Validate context
    const langContext = DocumentParser.getLanguageContext(document, position);
    if (langContext === 'php') {
        return [];
    }

    // 3. Generate completions
    // ...
}
```

## Debugging

### Launch Extension Development Host

1. Open workspace in VSCode
2. Press **F5** (or Run → Start Debugging)
3. New window opens with extension loaded
4. Open PHP/HTML file to test

### Console Logging

All logs appear in **Debug Console** (not the Extension Development Host console):

```
[WP Interactivity API] Scanning directory: /path/to/dir
[WP Interactivity API] Found files: { php: 1, js: 2 }
[WP Interactivity API] JS stores found: 1
[WP Interactivity API] Store: myPlugin { state: ['counter'], actions: ['toggle'] }
```

### Common Issues

**Autocomplete not appearing:**
- Verify document language is 'php' or 'html'
- Check cursor is in HTML attribute position (not inside `<?php ?>` tags)
- Verify configuration settings are enabled
- Check Debug Console for errors

**Store not detected:**
- **Critical**: Store file must be in same directory as template file
- Run command: "WordPress Interactivity API: Show Available Stores"
- Check Debug Console for parsing errors
- Verify syntax matches detection patterns above

**Duplicate warnings incorrect:**
- Review duplication rules in `src/constants/directives.ts`
- Check `DuplicateValidator` logic
- Verify HTML parser found correct element boundaries

## Testing

### Manual Testing Workflow

1. Create test directory with these files:

**view.js:**
```javascript
import { store } from '@wordpress/interactivity';

store('myPlugin', {
    state: {
        counter: 0,
        isOpen: false
    },
    actions: {
        toggle: () => {}
    }
});
```

**template.php:**
```php
<div data-wp-interactive="myPlugin">
    <button data-wp-on--click="actions.toggle">
        <span data-wp-text="state.counter"></span>
    </button>
</div>
```

2. Press F5 to launch Extension Development Host
3. Open `template.php`
4. Test:
   - Type `data-` → should suggest directives
   - Type `state.` → should suggest `counter`, `isOpen`
   - Type `actions.` → should suggest `toggle`

### Test Commands

In Extension Development Host, open Command Palette (Cmd+Shift+P):
- **WordPress Interactivity API: Show Available Stores** - Verify stores detected
- **WordPress Interactivity API: Refresh Store Cache** - Force rescan

## Important WordPress Interactivity API Context

### Directive Categories (21 Total)

1. **Core** (2): `data-wp-interactive`, `data-wp-context`
2. **Attributes** (5): `data-wp-bind--*`, `data-wp-class--*`, `data-wp-style--*`, `data-wp-text`, `data-wp-html`
3. **Events** (3): `data-wp-on--*`, `data-wp-on-window--*`, `data-wp-on-document--*`
4. **Side Effects** (9): `data-wp-init`, `data-wp-watch`, `data-wp-effect`, `data-wp-interactive`, etc.
5. **Lists** (2): `data-wp-each`, `data-wp-each-key`

### Value Reference Patterns

- `state.propertyName` - Global state from store
- `context.propertyName` - Local context from `data-wp-context`
- `actions.methodName` - Action methods
- `callbacks.methodName` - Callback methods
- `namespace::state.property` - Cross-namespace reference

## Repository-Specific Guidelines

### Never Use Regex for Parsing
Use AST parsers exclusively:
- PHP: `php-parser` library
- JavaScript/TypeScript: `@babel/parser` + `@babel/traverse`
- HTML: `node-html-parser`

### Configuration Settings

All settings prefix: `wpInteractivityAPI.*`
- `enableDirectiveCompletion` (boolean, default: true)
- `enableValueCompletion` (boolean, default: true)
- `enableDuplicateWarnings` (boolean, default: true)
- `parseInlineContexts` (boolean, default: true)

### File Naming Conventions

- Classes: PascalCase (`DirectiveCompletionProvider`)
- Files: camelCase (`directiveCompletionProvider.ts`)
- Interfaces: PascalCase (`DirectiveInfo`, `StoreDefinition`)
- Constants: UPPER_SNAKE_CASE or PascalCase for exports

## Build System

- **Bundler**: Webpack 5
- **Compiler**: TypeScript (strict mode)
- **Entry**: `src/extension.ts`
- **Output**: `dist/extension.js`
- **Source Maps**: Hidden in production (`--devtool hidden-source-map`)

## Extension Lifecycle

1. **Activation**: On opening PHP or HTML file
2. **Initial Scan**: Scans active document's directory for stores
3. **File Watching**: Updates cache when store files change
4. **Document Change**: Debounced validation for duplicates and namespaces
5. **Editor Switch**: Rescans new directory, validates new document

## Commands

Registered commands (accessible via Command Palette):
- `wpInteractivityAPI.refreshStores` - Manually refresh store cache
- `wpInteractivityAPI.showStores` - Display all detected stores in QuickPick

## Dependencies

### Runtime
- `@babel/parser` - JavaScript/TypeScript AST parsing
- `@babel/traverse` - AST traversal
- `node-html-parser` - HTML parsing (tolerant mode)
- `php-parser` - PHP AST parsing

### Dev Dependencies
- `typescript` - TypeScript compiler
- `webpack` - Bundling
- `eslint` - Linting
- `@vscode/vsce` - Extension packaging
