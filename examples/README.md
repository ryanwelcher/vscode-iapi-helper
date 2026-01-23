# WordPress Interactivity API Helper - Examples

This directory contains example files for testing and demonstrating the extension's features.

## How to Use These Examples

1. **Open VSCode** in this repository
2. **Press F5** to launch the Extension Development Host
3. **Open any example file** from this directory in the Extension Development Host window
4. **Test autocomplete** by placing your cursor at the indicated positions and typing

## Example Files

### 1. `context-inline.html`
**Purpose:** Demonstrates inline context parsing with `data-wp-context` attributes

**Features tested:**
- ✅ Basic inline context property suggestions
- ✅ Nested context handling (closest context wins)
- ✅ Distinction between `state.` and `context.` suggestions
- ✅ Fallback to store when no inline context present
- ✅ Prefix filtering (e.g., typing `context.p` filters to properties starting with 'p')

**How to test:**
1. Open this file in Extension Development Host
2. Find comments like `<!-- Type "context." here -->`
3. Place cursor after `context.` in the attribute value
4. Press `Ctrl+Space` (or `Cmd+Space` on Mac) to trigger autocomplete
5. Verify the suggested properties match the comment

**Example:**
```html
<div data-wp-context='{"postId": 123, "isActive": true}'>
    <span data-wp-text="context.">
        <!-- Should suggest: postId, isActive -->
    </span>
</div>
```

---

### 2. `context-php-function.php`
**Purpose:** Demonstrates PHP function parsing for `wp_interactivity_data_wp_context()`

**Features tested:**
- ✅ Parsing PHP variable assignments
- ✅ Tracking `$context` variable through the file
- ✅ Handling `array_merge()` function calls
- ✅ Extracting properties from PHP arrays

**How to test:**
1. Open this file in Extension Development Host
2. Place cursor after `context.` in line 25
3. Press `Ctrl+Space` to trigger autocomplete
4. Verify it suggests: `slides`, `currentSlide`, `totalSlides`

**Example:**
```php
<?php
$context = array_merge(
    array(
        'slides'       => array(),
        'currentSlide' => 0,
        'totalSlides'  => 0,
    )
);
?>
<div <?php echo wp_interactivity_data_wp_context( $context ); ?>>
    <button data-wp-bind--aria-pressed="context.">
        <!-- Should suggest: slides, currentSlide, totalSlides -->
    </button>
</div>
```

---

### 3. `duplicate-detection.html`
**Purpose:** Demonstrates duplicate directive detection and validation

**Features tested:**
- ⚠️ Warning for duplicate `data-wp-text` directives
- ⚠️ Warning for duplicate `data-wp-bind--src` (same suffix)
- ✅ Allows multiple `data-wp-bind--*` with different suffixes
- ⚠️ Warning for duplicate `data-wp-context` directives
- ✅ Allows multiple `data-wp-on--click` handlers
- ⚠️ Warning for duplicate `data-wp-show` directives

**How to test:**
1. Open this file in Extension Development Host
2. Look for yellow squiggly lines under duplicate directives
3. Hover over warnings to see diagnostic messages
4. Verify that allowed duplicates don't show warnings

**Expected warnings:**
- Line 8: Duplicate `data-wp-text` ⚠️
- Line 13: Duplicate `data-wp-bind--src` ⚠️
- Line 19: Duplicate `data-wp-context` ⚠️
- Line 29: Duplicate `data-wp-show` ⚠️

**No warnings (these are allowed):**
- Line 16: Different suffixes for `data-wp-bind--*` ✅
- Line 24: Multiple `data-wp-on--click` handlers ✅

---

### 4. `store-definition.js` (Companion file)
**Purpose:** Example JavaScript store definition for testing state/actions suggestions

**How to use:**
1. Place this file in the same directory as your test PHP/HTML file
2. The extension will automatically detect and parse it
3. Properties from this store will be suggested when typing `state.` or `actions.`

**Example:**
```javascript
import { store } from '@wordpress/interactivity';

store('myPlugin', {
    state: {
        counter: 0,
        isOpen: false,
        message: ''
    },
    actions: {
        toggle: () => {
            state.isOpen = !state.isOpen;
        },
        increment: () => {
            state.counter++;
        }
    },
    callbacks: {
        logToConsole: () => {
            console.log('Callback executed');
        }
    }
});
```

---

## Testing Workflow

### Quick Test
1. Open an example file in Extension Development Host
2. Follow the inline comments for where to type
3. Trigger autocomplete and verify suggestions

### Full Feature Test
1. **Directive Autocomplete:**
   - Type `data-` in any HTML tag → should show all 21 directives

2. **Value Autocomplete (State):**
   - Create `store-definition.js` with state properties
   - Type `state.` in a directive value → should show state properties

3. **Value Autocomplete (Context - Inline):**
   - Open `context-inline.html`
   - Type `context.` → should show inline context properties

4. **Value Autocomplete (Context - PHP):**
   - Open `context-php-function.php`
   - Type `context.` → should show PHP-defined context properties

5. **Duplicate Detection:**
   - Open `duplicate-detection.html`
   - Verify warnings appear for duplicate directives

### Configuration Testing

Test with different settings in Extension Development Host:

```json
{
    "wpInteractivityAPI.enableDirectiveCompletion": true/false,
    "wpInteractivityAPI.enableValueCompletion": true/false,
    "wpInteractivityAPI.enableDuplicateWarnings": true/false,
    "wpInteractivityAPI.parseInlineContexts": true/false
}
```

---

## Creating Your Own Test Cases

### For Context Testing
1. Create a new HTML/PHP file in this directory
2. Add `data-wp-context` attribute or `wp_interactivity_data_wp_context()` call
3. Test `context.` autocomplete

### For Store Testing
1. Create `view.js` with a `store()` definition
2. Create a PHP/HTML file in the same directory
3. Add `data-wp-interactive="your-namespace"`
4. Test `state.` and `actions.` autocomplete

### For Duplicate Testing
1. Create an HTML file
2. Add duplicate directives on the same element
3. Verify appropriate warnings appear

---

## Debugging Tips

If autocomplete isn't working:

1. **Check Debug Console** (View → Debug Console in Extension Development Host)
   - Look for `[WP Interactivity API]` log messages
   - Check if stores were detected

2. **Verify Language ID**
   - File must be recognized as 'php' or 'html'
   - Check status bar in bottom right corner

3. **Check Cursor Position**
   - Must be in HTML attribute value (inside quotes)
   - Not inside PHP tags (`<?php ?>`)

4. **Use Extension Commands**
   - `Cmd+Shift+P` → "WordPress Interactivity API: Show Available Stores"
   - `Cmd+Shift+P` → "WordPress Interactivity API: Refresh Store Cache"

---

## Contributing Examples

When adding new examples:

1. **Naming convention:** Use descriptive kebab-case names
2. **Add comments:** Explain what each test case demonstrates
3. **Update this README:** Add documentation for your example
4. **Test thoroughly:** Verify the example works in Extension Development Host

---

## Related Documentation

- [DEVELOPMENT.md](../DEVELOPMENT.md) - Development guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [README.md](../README.md) - Extension features and usage
- [WordPress Interactivity API Docs](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/)
