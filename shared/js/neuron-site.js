/**
 * NeuronSite - Utility for identifying the active Fala.BR site from a URL
 * Maps URLs to site aliases for environment-specific data isolation
 */

var NeuronSite = NeuronSite || (function () {
    'use strict';

    const SITES = {
        producao: 'falabr.cgu.gov.br',
        treinamento: 'treinafalabr.cgu.gov.br',
        homologacao: 'falabr-h.cgu.gov.br'
    };

    const LABELS = {
        producao: 'PROD',
        treinamento: 'TREINA',
        homologacao: 'HOMOLOG'
    };

    // Reverse map: domain -> alias
    const DOMAIN_TO_ALIAS = {};
    for (const [alias, domain] of Object.entries(SITES)) {
        DOMAIN_TO_ALIAS[domain] = alias;
    }

    /**
     * Get the site alias from a URL string
     * @param {string} url - Full URL to parse
     * @returns {string|null} Site alias ('producao', 'treinamento', 'homologacao') or null
     */
    function getFromUrl(url) {
        if (!url || typeof url !== 'string') return null;
        try {
            const hostname = new URL(url).hostname;
            return DOMAIN_TO_ALIAS[hostname] || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get the full domain for a site alias
     * @param {string} alias - Site alias
     * @returns {string|null} Domain string or null
     */
    function getDomain(alias) {
        return SITES[alias] || null;
    }

    /**
     * Get the short display label for a site alias
     * @param {string} alias - Site alias
     * @returns {string|null} Label string or null
     */
    function getLabel(alias) {
        return LABELS[alias] || null;
    }

    return {
        SITES,
        getFromUrl,
        getDomain,
        getLabel
    };
})();

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeuronSite;
}
