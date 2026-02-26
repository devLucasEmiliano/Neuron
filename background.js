/**
 * @file background.js
 * @description Background service worker for Neuron extension
 */

// Import idb library, NeuronDB, and NeuronSync
importScripts('vendor/idb.min.js', 'shared/js/neuron-db.js', 'shared/js/neuron-sync.js');

// Ensure proper extension initialization
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Neuron extension installed/updated successfully');

    try {
        await NeuronDB.init();
        const existingConfig = await NeuronDB.getConfig('neuronUserConfig');
        if (!existingConfig) {
            const response = await fetch(chrome.runtime.getURL('config/config.json'));
            const defaultConfig = await response.json();
            await NeuronDB.setConfig('neuronUserConfig', defaultConfig);
            console.log('Neuron: Default config initialized in IndexedDB');
        }
    } catch (error) {
        console.error('Neuron: Failed to initialize default config:', error);
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

// Handle config changes via BroadcastChannel for debugging if needed
NeuronSync.onConfigChange((key) => {
    if (key === 'neuronUserConfig') {
        console.log('Neuron configuration updated');
    }
});