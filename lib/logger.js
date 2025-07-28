/**
 * @file logger.js
 * @description Standardized logging utility for Neuron extension
 * @version 1.0
 */

window.NeuronLogger = (function() {
    'use strict';

    // Color scheme for different log levels
    const COLORS = {
        info: '#2196F3',      // Blue
        success: '#4CAF50',   // Green  
        warning: '#FF9800',   // Orange
        error: '#F44336',     // Red
        debug: '#9C27B0',     // Purple
        config: '#607D8B'     // Blue Grey
    };

    // Log level priorities (higher number = higher priority)
    const LOG_LEVELS = {
        debug: 0,
        info: 1,
        success: 2,
        warning: 3,
        error: 4
    };

    // Current log level (can be configured)
    let currentLogLevel = LOG_LEVELS.debug;

    /**
     * Creates a standardized log message
     * @param {string} module - Module name (e.g., 'loading', 'popup', 'date_utils')
     * @param {string} level - Log level ('info', 'success', 'warning', 'error', 'debug')
     * @param {string} message - The log message
     * @param {any} [data] - Optional data to log
     */
    function createLog(module, level, message, data) {
        if (LOG_LEVELS[level] < currentLogLevel) {
            return; // Don't log if below current log level
        }

        const timestamp = new Date().toLocaleTimeString('pt-BR', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        
        const prefix = `[Neuron|${module}]`;
        const color = COLORS[level] || COLORS.info;
        const style = `color: ${color}; font-weight: bold;`;
        
        const fullMessage = `${prefix} ${timestamp} ${message}`;

        switch (level) {
            case 'error':
                if (data !== undefined) {
                    console.error(`%c${fullMessage}`, style, data);
                } else {
                    console.error(`%c${fullMessage}`, style);
                }
                break;
            case 'warning':
                if (data !== undefined) {
                    console.warn(`%c${fullMessage}`, style, data);
                } else {
                    console.warn(`%c${fullMessage}`, style);
                }
                break;
            default:
                if (data !== undefined) {
                    console.log(`%c${fullMessage}`, style, data);
                } else {
                    console.log(`%c${fullMessage}`, style);
                }
                break;
        }
    }

    /**
     * Creates a logger instance for a specific module
     * @param {string} moduleName - Name of the module
     * @returns {object} Logger instance with convenience methods
     */
    function createLogger(moduleName) {
        return {
            info: (message, data) => createLog(moduleName, 'info', message, data),
            success: (message, data) => createLog(moduleName, 'success', message, data),
            warning: (message, data) => createLog(moduleName, 'warning', message, data),
            error: (message, data) => createLog(moduleName, 'error', message, data),
            debug: (message, data) => createLog(moduleName, 'debug', message, data),
            config: (message, data) => createLog(moduleName, 'config', message, data)
        };
    }

    /**
     * Sets the minimum log level
     * @param {string} level - Minimum log level ('debug', 'info', 'success', 'warning', 'error')
     */
    function setLogLevel(level) {
        if (LOG_LEVELS.hasOwnProperty(level)) {
            currentLogLevel = LOG_LEVELS[level];
        }
    }

    return {
        createLogger,
        setLogLevel,
        LOG_LEVELS
    };
})();