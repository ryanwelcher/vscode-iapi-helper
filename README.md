# WordPress Interactivity API Helper

Intelligent autocomplete and validation for WordPress Interactivity API directives in VSCode and PHPStorm.

## Features

- 🎯 **Directive Autocomplete**: Get intelligent suggestions for all `data-wp-*` directives as you type
- 🔍 **Context-Aware Value Suggestions**: Autocomplete for state, actions, and callbacks based on detected stores
- ⚠️ **Duplicate Detection**: Warnings for improperly duplicated directives on the same element
- 🚨 **Namespace Validation**: Warnings when using undefined store namespaces with typo suggestions (VSCode)
- 📁 **Directory-Scoped Store Detection**: Automatically discovers store definitions from PHP and JavaScript/TypeScript files
- 📝 **Inline Context Parsing**: Suggests properties from inline `data-wp-context` attributes (VSCode)
- 🔄 **Multiline Attribute Support**: Autocomplete works across multiline HTML attributes
- 💾 **Smart Caching**: Automatically updates stores when files change

## Installation

### VS Code

Search for "WordPress Interactivity API Helper" in the VS Code Marketplace or install it via the Command Palette:
`ext install ryanwelcher.wordpress-interactivity-api-helper`

### PHPStorm

The PHPStorm plugin is currently in development. To use it:
1. Clone this repository
2. Navigate to `phpstorm-plugin`
3. Run `./gradlew buildPlugin`
4. In PHPStorm, go to `Settings > Plugins > ⚙️ > Install Plugin from Disk...` and select the ZIP file from `build/distributions/`.

## Usage

### Directive Autocomplete

Simply start typing `data-` in any HTML attribute position within PHP or HTML files:

```html
<div data-wp-interactive="myPlugin">
  <button data-wp-on--click="actions.toggle">
    <!-- Autocomplete will suggest all available directives -->
  </button>
</div>
```

### Value Suggestions

When writing directive values, the extension will suggest available properties from your stores:

```html
<div data-wp-interactive="myPlugin">
  <span data-wp-text="state.">
    <!-- Autocomplete will show all state properties from myPlugin store -->
  </span>
</div>
```

## Commands

The extension provides the following commands (accessible via Command Palette `Cmd+Shift+P` / `Ctrl+Shift+P`):

- **WordPress Interactivity API: Refresh Store Cache** - Manually refresh the store cache to pick up changes from store files
- **WordPress Interactivity API: Show Available Stores** - Display all currently detected stores with their state, actions, and callbacks count

## Validation & Diagnostics

### Duplicate Directive Detection

The extension warns you when directives are improperly duplicated on the same element:

```html
<!-- ⚠️ Warning: Duplicate data-wp-on--click directive -->
<button
  data-wp-on--click="actions.open"
  data-wp-on--click="actions.close">
</button>
```

### Namespace Validation

Get warnings when using undefined store namespaces, with intelligent typo suggestions:

```html
<!-- ⚠️ Warning: No store found for namespace "my-stor". Did you mean "my-store"? -->
<div data-wp-interactive="my-stor">
</div>
```

### Store Detection

The extension automatically scans PHP and JavaScript/TypeScript files in the same directory for store definitions:

**PHP:**
```php
wp_interactivity_state('myPlugin', array(
    'counter' => 0,
    'isOpen' => false
));
```

**JavaScript/TypeScript (Inline):**
```javascript
import { store } from '@wordpress/interactivity';

store('myPlugin', {
    state: {
        counter: 0,
        isOpen: false
    },
    actions: {
        toggle: () => { /* ... */ }
    }
});
```

**TypeScript (Variable Reference with Generics):**
```typescript
import { store } from '@wordpress/interactivity';

// Define server-side state type
type MyPluginServerState = {
    state: {
        counter: number;
        isOpen: boolean;
    };
};

// Define client-side store
const myPluginStore = {
    state: {},
    actions: {
        increment() {
            state.counter++;
        },
        toggle() {
            state.isOpen = !state.isOpen;
        }
    },
    callbacks: {}
};

// Merge server and client types
type MyPluginStore = MyPluginServerState & typeof myPluginStore;

// Create typed store
const { state } = store<MyPluginStore>('myPlugin', myPluginStore);
```

## Configuration

Configure the extension through VSCode settings:

- `wpInteractivityAPI.enableDirectiveCompletion`: Enable/disable directive autocomplete (default: `true`)
- `wpInteractivityAPI.enableValueCompletion`: Enable/disable value autocomplete (default: `true`)
- `wpInteractivityAPI.enableDuplicateWarnings`: Show warnings for duplicate directives (default: `true`)
- `wpInteractivityAPI.parseInlineContexts`: Parse inline context attributes for suggestions (default: `true`)

## Supported Directives

### Core
- `data-wp-interactive` - Activates interactivity and defines namespace
- `data-wp-context` - Provides local state

### Attributes
- `data-wp-bind--[attribute]` - Sets HTML attributes dynamically
- `data-wp-class--[className]` - Toggles CSS classes
- `data-wp-style--[property]` - Applies inline styles
- `data-wp-text` - Sets text content

### Events
- `data-wp-on--[event]` - Attaches event listeners
- `data-wp-on-async--[event]` - Async event handlers
- `data-wp-on-window--[event]` - Window event listeners
- `data-wp-on-async-window--[event]` - Async window events
- `data-wp-on-document--[event]` - Document event listeners
- `data-wp-on-async-document--[event]` - Async document events

### Side Effects
- `data-wp-watch` - Runs on creation and state changes
- `data-wp-init` - Runs once on element creation
- `data-wp-run` - Executes during render

### Lists
- `data-wp-key` - Assigns unique keys for list items
- `data-wp-each` - Renders lists from arrays
- `data-wp-each-child` - Designates child elements in loops

## Development

### Building

```bash
npm run compile      # Development build
npm run watch        # Watch mode
npm run package      # Production build
```

### Testing

```bash
npm test
```

## Requirements

- VSCode 1.85.0 or higher
- WordPress 6.5+ or Gutenberg 17.5+

## Release Notes

### 0.1.0

Initial release with basic directive autocomplete, duplicate detection, and store parsing.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## What Gets Autocompleted?

### Directives
- All `data-wp-*` directives with descriptions and examples
- Proper suffix patterns (e.g., `data-wp-bind--[attribute]`)

### State Properties
When typing `state.` the extension suggests:
- Properties from the current namespace's store
- Properties from inline `data-wp-context` attributes
- Nested object properties

### Actions
When typing `actions.` the extension suggests:
- All actions defined in the current namespace's store
- Function signatures with parameter information

### Callbacks
When typing `callbacks.` the extension suggests:
- All callbacks defined in the current namespace's store
- Used with `data-wp-watch`, `data-wp-init`, etc.

## Supported File Types

- **PHP** (`.php`) - For templates and store definitions via `wp_interactivity_state()`
- **HTML** (`.html`) - For static templates
- **JavaScript** (`.js`) - For store definitions
- **TypeScript** (`.ts`, `.tsx`) - For typed store definitions
- **JSX** (`.jsx`) - For React-based stores

## License

GPL-3.0
