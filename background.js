/**
 * @file background.js
 * @description Background service worker for Neuron extension
 */

// Import NeuronDB and NeuronSync
importScripts('shared/js/neuron-site.js', 'shared/js/neuron-db.js', 'shared/js/neuron-sync.js');

// Ensure proper extension initialization
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Neuron extension installed/updated successfully');

    try {
        await NeuronDB.init();
        const existingConfig = await NeuronDB.getConfig('neuronUserConfig');
        if (!existingConfig) {
            const response = await fetch(chrome.runtime.getURL('config/config.json'));
            const defaultConfig = await response.json();
            await NeuronDB.setConfig('neuronUserConfig', defaultConfig);
            console.log('Neuron: Default config initialized in chrome.storage.local');
        }
    } catch (error) {
        console.error('Neuron: Failed to initialize default config:', error);
    }

    // Clean up old-format storage keys (without site prefix) on install/update
    if (details.reason === 'install' || details.reason === 'update') {
        try {
            const data = await chrome.storage.local.get('neuron_storage_v2');
            if (!data.neuron_storage_v2) {
                const oldKeys = ['neuron_demandas', 'neuron_concluidas', 'neuron_metadata'];
                const oldData = await chrome.storage.local.get(oldKeys);
                const keysToRemove = oldKeys.filter(key => oldData[key] !== undefined);
                if (keysToRemove.length > 0) {
                    await chrome.storage.local.remove(keysToRemove);
                    console.log('Neuron: Cleaned up old-format storage keys:', keysToRemove);
                }
                await chrome.storage.local.set({ neuron_storage_v2: true });
                console.log('Neuron: Storage migrated to v2 (per-site keys)');
            }
        } catch (error) {
            console.error('Neuron: Failed to clean up old storage keys:', error);
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

// Handle config changes via chrome.storage.onChanged for debugging
NeuronSync.onConfigChange((key) => {
    if (key === 'neuronUserConfig') {
        console.log('Neuron configuration updated');
    }
});