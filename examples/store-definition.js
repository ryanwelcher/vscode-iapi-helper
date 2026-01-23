/**
 * Example JavaScript store definition for WordPress Interactivity API
 *
 * This file demonstrates how to define stores that the extension will
 * automatically detect and use for autocomplete suggestions.
 *
 * Place this file in the same directory as your PHP/HTML template files.
 */

import { store } from '@wordpress/interactivity';

/**
 * Example store for myPlugin namespace
 *
 * When you type state., actions., or callbacks. in your templates,
 * the extension will suggest properties from this store.
 */
store('myPlugin', {
    state: {
        // Basic types
        counter: 0,
        isOpen: false,
        message: '',

        // Arrays
        items: [],

        // Objects
        user: {
            name: '',
            email: ''
        },

        // Numbers
        currentIndex: 0,
        total: 10
    },

    actions: {
        /**
         * Toggle the isOpen state
         */
        toggle: () => {
            const { state } = store('myPlugin');
            state.isOpen = !state.isOpen;
        },

        /**
         * Increment the counter
         */
        increment: () => {
            const { state } = store('myPlugin');
            state.counter++;
        },

        /**
         * Decrement the counter
         */
        decrement: () => {
            const { state } = store('myPlugin');
            state.counter--;
        },

        /**
         * Update message
         */
        updateMessage: (event) => {
            const { state } = store('myPlugin');
            state.message = event.target.value;
        },

        /**
         * Navigate to next item
         */
        next: () => {
            const { state } = store('myPlugin');
            if (state.currentIndex < state.total - 1) {
                state.currentIndex++;
            }
        },

        /**
         * Navigate to previous item
         */
        previous: () => {
            const { state } = store('myPlugin');
            if (state.currentIndex > 0) {
                state.currentIndex--;
            }
        }
    },

    callbacks: {
        /**
         * Log to console when element is initialized
         */
        logInit: () => {
            console.log('Element initialized');
        },

        /**
         * Log state changes
         */
        logStateChange: () => {
            const { state } = store('myPlugin');
            console.log('State changed:', state);
        },

        /**
         * Focus element when condition is met
         */
        focusOnOpen: () => {
            const { state } = store('myPlugin');
            const { ref } = getElement();

            if (state.isOpen && ref) {
                ref.focus();
            }
        }
    }
});

/**
 * Example: Multiple stores in the same file
 *
 * You can define multiple stores for different namespaces.
 * Each will be detected and used for autocomplete independently.
 */
store('anotherPlugin', {
    state: {
        enabled: true,
        config: {}
    },
    actions: {
        enable: () => {
            const { state } = store('anotherPlugin');
            state.enabled = true;
        },
        disable: () => {
            const { state } = store('anotherPlugin');
            state.enabled = false;
        }
    }
});

/**
 * Example: TypeScript store with type annotations
 *
 * If using TypeScript, the extension will still parse this correctly.
 */
// Uncomment if using TypeScript:
/*
type MyStore = {
    state: {
        count: number;
        items: string[];
    };
    actions: {
        add: () => void;
        remove: () => void;
    };
};

store<MyStore>('typedStore', {
    state: {
        count: 0,
        items: []
    },
    actions: {
        add: () => {},
        remove: () => {}
    }
});
*/
