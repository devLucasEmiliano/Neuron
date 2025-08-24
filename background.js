/**
 * @file background.js
 * @description Background service worker for Neuron extension
 */

// Create logger for background script (background scripts don't have access to content script logger)
const logger = {
    info: (message, data) => console.log(`%c[Neuron|background] ${new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })} ${message}`, 'color: #2196F3; font-weight: bold;', data || ''),
    success: (message, data) => console.log(`%c[Neuron|background] ${new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })} ${message}`, 'color: #4CAF50; font-weight: bold;', data || ''),
    warning: (message, data) => console.warn(`%c[Neuron|background] ${new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })} ${message}`, 'color: #FF9800; font-weight: bold;', data || ''),
    error: (message, data) => console.error(`%c[Neuron|background] ${new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })} ${message}`, 'color: #F44336; font-weight: bold;', data || '')
};

// Ensure proper extension initialization
chrome.runtime.onInstalled.addListener(() => {
    logger.success('Extensão instalada/atualizada com sucesso');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    logger.info('Extensão iniciada');
});

// Basic error handling for the background script
self.addEventListener('error', (error) => {
    logger.error('Erro no script background', error);
});

// Handle storage changes for debugging if needed
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.neuronUserConfig) {
        logger.info('Configuração do Neuron atualizada');
    }
});