/**
 * @file background.ts
 * @description Background service worker for Neuron extension
 */

// Import NeuronDB and NeuronSync
import defaultConfig from '@/config/config.json';
import { NeuronDB } from '@/lib/neuron-db';
import { NeuronSync } from '@/lib/neuron-sync';
import type { NeuronUserConfig } from '@/lib/types';

export default defineBackground({
    main() {
        // all listeners registered synchronously (MV3 wake-ups); main() must NOT be async

        // Ensure proper extension initialization
        browser.runtime.onInstalled.addListener(async (details) => {
            console.log('Neuron extension installed/updated successfully');

            try {
                await NeuronDB.init();
                const existingConfig = await NeuronDB.getConfig('neuronUserConfig');
                if (!existingConfig) {
                    // config.json é importado em build time (antes: fetch(chrome.runtime.getURL('config/config.json')))
                    await NeuronDB.setConfig('neuronUserConfig', structuredClone(defaultConfig) as NeuronUserConfig);
                    console.log('Neuron: Default config initialized in chrome.storage.local');
                }
            } catch (error) {
                console.error('Neuron: Failed to initialize default config:', error);
            }

            // Clean up old-format storage keys (without site prefix) on install/update
            if (details.reason === 'install' || details.reason === 'update') {
                try {
                    const data = await browser.storage.local.get('neuron_storage_v2');
                    if (!data.neuron_storage_v2) {
                        const oldKeys = ['neuron_demandas', 'neuron_concluidas', 'neuron_metadata'];
                        const oldData = await browser.storage.local.get(oldKeys);
                        const keysToRemove = oldKeys.filter(key => oldData[key] !== undefined);
                        if (keysToRemove.length > 0) {
                            await browser.storage.local.remove(keysToRemove);
                            console.log('Neuron: Cleaned up old-format storage keys:', keysToRemove);
                        }
                        await browser.storage.local.set({ neuron_storage_v2: true });
                        console.log('Neuron: Storage migrated to v2 (per-site keys)');
                    }
                } catch (error) {
                    console.error('Neuron: Failed to clean up old storage keys:', error);
                }

                // Remove the session key left behind by the suggestions board removed in 02.013
                try {
                    await browser.storage.local.remove('neuron_supabase_session');
                    console.log('Neuron: Removed legacy neuron_supabase_session key');
                } catch (error) {
                    console.error('Neuron: Failed to remove legacy session key:', error);
                }
            }
        });

        // Handle extension startup
        browser.runtime.onStartup.addListener(() => {
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
    },
});
