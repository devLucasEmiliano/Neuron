/**
 * NeuronSupabase - Lightweight Supabase REST client for Neuron Extension
 *
 * Auth model: Supabase Anonymous Sign-Ins.
 * On first use, signs in anonymously via /auth/v1/signup (no email/password).
 * The returned JWT is the source of truth for voter_id / author_id — RLS
 * policies on the database check `auth.uid()` against the row, so the client
 * cannot forge identities. Session (access_token + refresh_token) is persisted
 * in chrome.storage.local and auto-refreshed on expiry or 401 responses.
 */

import { browser } from 'wxt/browser';
import supabaseConfig from '@/config/supabase.json';
import { errorMessage } from './neuron-utils';
import type { CreateSuggestionInput, Suggestion, SupabaseSession, Vote } from '@/lib/types';

const SESSION_KEY = 'neuron_supabase_session';

/** config/supabase.json (URL + anon key). */
interface SupabaseConfig {
    url: string;
    anonKey: string;
}

/** Corpo 2xx de /auth/v1/signup e /auth/v1/token?grant_type=refresh_token (campos usados). */
interface AuthResponse {
    access_token: string;
    refresh_token: string;
    /** epoch em segundos */
    expires_at: number;
    user?: { id?: string };
}

/** Corpo de erro do GoTrue (/auth/v1/*): o campo com a mensagem varia por endpoint/versão. */
interface AuthErrorBody {
    error_description?: string;
    msg?: string;
    message?: string;
}

/** Corpo de erro do PostgREST (/rest/v1/*). */
interface RestErrorBody {
    message?: string;
    hint?: string;
}

/**
 * Opções de request(): RequestInit com `headers` como objeto simples,
 * para poder mesclá-lo (spread) aos headers padrão.
 */
interface RequestOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>;
}

// Static config (URL + anon key): importado em build time (antes: fetch(chrome.runtime.getURL('config/supabase.json')))
const config: SupabaseConfig = supabaseConfig;
let session: SupabaseSession | null = null;          // { access_token, refresh_token, expires_at, user_id }
let initPromise: Promise<void> | null = null;

// ========== Helpers (fronteiras JSON/storage) ==========
/**
 * Corpos JSON (GoTrue, PostgREST) e a sessão persistida (escrita apenas por
 * saveSession) chegam como `unknown`; em runtime só a forma de objeto é
 * verificada, os campos são os documentados pelas APIs.
 */
function isJsonObject<T extends object>(value: unknown): value is T {
    return typeof value === 'object' && value !== null;
}

// ========== Session Storage ==========
async function loadSession(): Promise<SupabaseSession | null> {
    const data: Record<string, unknown> = await browser.storage.local.get(SESSION_KEY);
    const stored = data[SESSION_KEY];
    return isJsonObject<SupabaseSession>(stored) ? stored : null;
}

async function saveSession(newSession: SupabaseSession): Promise<void> {
    session = newSession;
    await browser.storage.local.set({ [SESSION_KEY]: newSession });
}

async function clearSession(): Promise<void> {
    session = null;
    await browser.storage.local.remove(SESSION_KEY);
}

function sessionExpired(s: SupabaseSession | null): boolean {
    if (!s || !s.expires_at) return true;
    // Refresh 60s before actual expiry to avoid edge cases
    return Date.now() >= (s.expires_at - 60) * 1000;
}

function normalizeSession(raw: AuthResponse): SupabaseSession {
    return {
        access_token: raw.access_token,
        refresh_token: raw.refresh_token,
        expires_at: raw.expires_at,
        user_id: raw.user && raw.user.id
    };
}

// ========== Auth Endpoints ==========
async function authFetch(path: string, body: unknown): Promise<AuthResponse> {
    const res = await fetch(config.url + '/auth/v1/' + path, {
        method: 'POST',
        headers: {
            'apikey': config.anonKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const json: unknown = await res.json().catch(function () { return {}; });
    if (!res.ok) {
        const error: AuthErrorBody = isJsonObject<AuthErrorBody>(json) ? json : {};
        const msg = error.error_description || error.msg || error.message || ('HTTP ' + res.status);
        throw new Error('[Auth] ' + msg);
    }
    // Fronteira JSON: GoTrue devolve sempre um objeto em 2xx
    return json as AuthResponse;
}

async function signInAnonymously(): Promise<SupabaseSession> {
    // Empty body signup = anonymous user. Requires "Anonymous Sign-Ins"
    // enabled in Supabase dashboard (Authentication → Providers → Anonymous).
    const raw = await authFetch('signup', { data: {} });
    const newSession = normalizeSession(raw);
    await saveSession(newSession);
    return newSession;
}

async function refreshSession(): Promise<SupabaseSession> {
    if (!session || !session.refresh_token) {
        return signInAnonymously();
    }
    try {
        const raw = await authFetch('token?grant_type=refresh_token', {
            refresh_token: session.refresh_token
        });
        const newSession = normalizeSession(raw);
        await saveSession(newSession);
        return newSession;
    } catch (err) {
        // Refresh token invalid/expired → start fresh
        console.warn('[NeuronSupabase] Refresh failed, signing in again:', errorMessage(err));
        await clearSession();
        return signInAnonymously();
    }
}

// ========== Init ==========
async function init(): Promise<void> {
    if (initPromise) return initPromise;

    initPromise = (async function () {
        // Static config (URL + anon key) já importado em build time (ver `config`)

        // Restore or create session
        session = await loadSession();
        if (!session) {
            await signInAnonymously();
        } else if (sessionExpired(session)) {
            await refreshSession();
        }
    })();

    return initPromise;
}

// ========== REST Request ==========
async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T | null> {
    await init();

    // Proactive refresh if expired
    if (sessionExpired(session)) {
        await refreshSession();
    }

    const url = config.url + '/rest/v1/' + path;
    const headers = {
        'apikey': config.anonKey,
        // init() acima garante a sessão
        'Authorization': 'Bearer ' + session!.access_token,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(options.headers || {})
    };
    const { headers: _h, ...rest } = options;
    const res = await fetch(url, { ...rest, headers: headers });

    // On 401, refresh once and retry
    if (res.status === 401 && !isRetry) {
        await refreshSession();
        return request<T>(path, options, true);
    }

    if (!res.ok) {
        const body: unknown = await res.json().catch(function () {
            return { message: res.statusText };
        });
        const error: RestErrorBody = isJsonObject<RestErrorBody>(body) ? body : {};
        throw new Error(error.message || error.hint || ('HTTP ' + res.status));
    }

    const text = await res.text();
    // Fronteira JSON: o formato das linhas é o das tabelas do PostgREST (tipado pelo chamador via T)
    return text ? (JSON.parse(text) as T) : null;
}

// ========== Public API ==========
export const NeuronSupabase = {
    init: init,

    getUserId: function (): string | null | undefined {
        return session && session.user_id;
    },

    /**
     * Force re-authentication (debug / "reset identity").
     */
    resetIdentity: async function (): Promise<void> {
        await clearSession();
        initPromise = null;
        await init();
    },

    /**
     * Fetch all suggestions ordered by vote count (desc), newest tiebreak.
     */
    getSuggestions: function (): Promise<Suggestion[] | null> {
        return request<Suggestion[]>('suggestions?order=vote_count.desc,created_at.desc&select=*');
    },

    /**
     * Create a new suggestion. author_id is filled server-side via DEFAULT auth.uid().
     */
    createSuggestion: function (data: CreateSuggestionInput): Promise<Suggestion[] | null> {
        return request<Suggestion[]>('suggestions', {
            method: 'POST',
            body: JSON.stringify({
                title: data.title,
                description: data.description,
                category: data.category
            })
        });
    },

    /**
     * Vote for a suggestion. voter_id is filled server-side via DEFAULT auth.uid().
     */
    vote: function (suggestionId: string): Promise<Vote[] | null> {
        return request<Vote[]>('votes', {
            method: 'POST',
            body: JSON.stringify({ suggestion_id: suggestionId })
        });
    },

    /**
     * Remove the current user's vote on a suggestion.
     * RLS restricts DELETE to rows where voter_id = auth.uid().
     */
    unvote: function (suggestionId: string): Promise<Vote[] | null> {
        return request<Vote[]>(
            'votes?suggestion_id=eq.' + suggestionId,
            { method: 'DELETE' }
        );
    },

    /**
     * Get suggestion IDs the current user has voted for.
     */
    getMyVotes: async function (): Promise<Pick<Vote, 'suggestion_id'>[] | null> {
        await init();
        // init() acima garante a sessão
        const uid = session!.user_id;
        return request<Pick<Vote, 'suggestion_id'>[]>('votes?voter_id=eq.' + uid + '&select=suggestion_id');
    }
};
