/**
 * NeuronSite - Utility for identifying the active Fala.BR site from a URL
 * Maps URLs to site aliases for environment-specific data isolation
 */

import { SITE_HOSTS, SITE_LABELS } from './sites';
import type { SiteAlias } from './types';
import { isSiteAlias } from './types';

export type { SiteAlias };

const SITES = SITE_HOSTS;

const LABELS = SITE_LABELS;

// Reverse map: domain -> alias
const DOMAIN_TO_ALIAS: Record<string, SiteAlias> = {};
for (const alias of Object.keys(SITES)) {
    if (isSiteAlias(alias)) {
        DOMAIN_TO_ALIAS[SITES[alias]] = alias;
    }
}

/**
 * Get the site alias from a URL string
 * @param {string} url - Full URL to parse
 * @returns {string|null} Site alias ('producao', 'treinamento', 'homologacao') or null
 */
function getFromUrl(url: string | null | undefined): SiteAlias | null {
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
function getDomain(alias: SiteAlias): string | null {
    return SITES[alias] || null;
}

/**
 * Get the short display label for a site alias
 * @param {string} alias - Site alias
 * @returns {string|null} Label string or null
 */
function getLabel(alias: SiteAlias): string | null {
    return LABELS[alias] || null;
}

export const NeuronSite = {
    SITES,
    getFromUrl,
    getDomain,
    getLabel
};
