/**
 * @file background.js
 * @description Background service worker for Neuron extension
 */

// Import idb library and NeuronDB
importScripts('lib/idb.min.js', 'shared/js/neuron-db.js');

// Ensure proper extension initialization and run migration
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Neuron extension installed/updated successfully');

    // Run migration on install or update
    if (details.reason === 'install' || details.reason === 'update') {
        try {
            const migrated = await NeuronDB.migrateFromChromeStorage();
            if (migrated) {
                console.log('Neuron: Data migration completed on', details.reason);
            }
        } catch (error) {
            console.error('Neuron: Migration error during', details.reason, error);
        }
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Neuron extension started');
});

// Basic error handling for the background script
self.addEventListener('error', (error) => {
    console.error('Neuron background script error:', error);
});

// Handle storage changes for debugging if needed
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.neuronUserConfig) {
        console.log('Neuron configuration updated');
    }
});