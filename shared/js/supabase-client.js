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

var NeuronSupabase = NeuronSupabase || (function () {
    'use strict';

    const SESSION_KEY = 'neuron_supabase_session';

    let config = null;
    let session = null;          // { access_token, refresh_token, expires_at, user_id }
    let initPromise = null;

    // ========== Session Storage ==========
    async function loadSession() {
        const data = await chrome.storage.local.get(SESSION_KEY);
        return data[SESSION_KEY] || null;
    }

    async function saveSession(newSession) {
        session = newSession;
        await chrome.storage.local.set({ [SESSION_KEY]: newSession });
    }

    async function clearSession() {
        session = null;
        await chrome.storage.local.remove(SESSION_KEY);
    }

    function sessionExpired(s) {
        if (!s || !s.expires_at) return true;
        // Refresh 60s before actual expiry to avoid edge cases
        return Date.now() >= (s.expires_at - 60) * 1000;
    }

    function normalizeSession(raw) {
        return {
            access_token: raw.access_token,
            refresh_token: raw.refresh_token,
            expires_at: raw.expires_at,
            user_id: raw.user && raw.user.id
        };
    }

    // ========== Auth Endpoints ==========
    async function authFetch(path, body) {
        const res = await fetch(config.url + '/auth/v1/' + path, {
            method: 'POST',
            headers: {
                'apikey': config.anonKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const json = await res.json().catch(function () { return {}; });
        if (!res.ok) {
            const msg = json.error_description || json.msg || json.message || ('HTTP ' + res.status);
            throw new Error('[Auth] ' + msg);
        }
        return json;
    }

    async function signInAnonymously() {
        // Empty body signup = anonymous user. Requires "Anonymous Sign-Ins"
        // enabled in Supabase dashboard (Authentication → Providers → Anonymous).
        const raw = await authFetch('signup', { data: {} });
        const newSession = normalizeSession(raw);
        await saveSession(newSession);
        return newSession;
    }

    async function refreshSession() {
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
            console.warn('[NeuronSupabase] Refresh failed, signing in again:', err.message);
            await clearSession();
            return signInAnonymously();
        }
    }

    // ========== Init ==========
    async function init() {
        if (initPromise) return initPromise;

        initPromise = (async function () {
            // Load static config (URL + anon key)
            const res = await fetch(chrome.runtime.getURL('config/supabase.json'));
            config = await res.json();

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
    async function request(path, options = {}, isRetry = false) {
        await init();

        // Proactive refresh if expired
        if (sessionExpired(session)) {
            await refreshSession();
        }

        const url = config.url + '/rest/v1/' + path;
        const headers = {
            'apikey': config.anonKey,
            'Authorization': 'Bearer ' + session.access_token,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...(options.headers || {})
        };
        const { headers: _h, ...rest } = options;
        const res = await fetch(url, { ...rest, headers: headers });

        // On 401, refresh once and retry
        if (res.status === 401 && !isRetry) {
            await refreshSession();
            return request(path, options, true);
        }

        if (!res.ok) {
            const error = await res.json().catch(function () {
                return { message: res.statusText };
            });
            throw new Error(error.message || error.hint || ('HTTP ' + res.status));
        }

        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }

    // ========== Public API ==========
    return {
        init: init,

        getUserId: function () {
            return session && session.user_id;
        },

        /**
         * Force re-authentication (debug / "reset identity").
         */
        resetIdentity: async function () {
            await clearSession();
            initPromise = null;
            await init();
        },

        /**
         * Fetch all suggestions ordered by vote count (desc), newest tiebreak.
         */
        getSuggestions: function () {
            return request('suggestions?order=vote_count.desc,created_at.desc&select=*');
        },

        /**
         * Create a new suggestion. author_id is filled server-side via DEFAULT auth.uid().
         */
        createSuggestion: function (data) {
            return request('suggestions', {
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
        vote: function (suggestionId) {
            return request('votes', {
                method: 'POST',
                body: JSON.stringify({ suggestion_id: suggestionId })
            });
        },

        /**
         * Remove the current user's vote on a suggestion.
         * RLS restricts DELETE to rows where voter_id = auth.uid().
         */
        unvote: function (suggestionId) {
            return request(
                'votes?suggestion_id=eq.' + suggestionId,
                { method: 'DELETE' }
            );
        },

        /**
         * Get suggestion IDs the current user has voted for.
         */
        getMyVotes: async function () {
            await init();
            const uid = session.user_id;
            return request('votes?voter_id=eq.' + uid + '&select=suggestion_id');
        }
    };
})();
