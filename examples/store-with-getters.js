/**
 * Example JavaScript store with getters
 *
 * This file tests getter detection for state properties.
 * Getters should appear as regular properties in autocomplete.
 */

import { store } from '@wordpress/interactivity';

store('testGetters', {
    state: {
        // Regular properties
        count: 0,
        items: [],

        // Getters (computed properties)
        get doubleCount() {
            const { state } = store('testGetters');
            return state.count * 2;
        },

        get itemCount() {
            const { state } = store('testGetters');
            return state.items.length;
        },

        get isEmpty() {
            const { state } = store('testGetters');
            return state.items.length === 0;
        }
    },

    actions: {
        increment: () => {
            const { state } = store('testGetters');
            state.count++;
        }
    }
});
