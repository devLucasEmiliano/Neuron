import { defineConfig } from 'wxt';
import { ALL_SITES_MATCH, SUPABASE_ORIGIN } from './src/lib/sites';

/** Ordem do array content_scripts do manifest legado (E1..E11). */
const LEGACY_ORDER = [
  'loading',
  'notificacoes',
  'tratar-triar',
  'arquivar',
  'encaminhar',
  'prorrogar',
  'tramitar',
  'tratar',
  'resposta',
  'sic-tratar',
  'sic-analisar',
];

export default defineConfig({
  srcDir: 'src',
  browser: 'chrome',
  manifestVersion: 3,
  manifest: {
    name: 'Fala.BR CGU - Neuron',
    description: 'Otimizador de fluxos de trabalho na plataforma Fala.br',
    // `version` precisa ser explícito: sem ele o WXT deriva de version_name ("02.012" → "0").
    version: '2.0.1',
    version_name: '02.012',
    icons: { 128: 'icon/128.png' },
    action: { default_icon: { 128: 'icon/128.png' } },
    permissions: ['storage'],
    host_permissions: [...ALL_SITES_MATCH, `${SUPABASE_ORIGIN}/*`],
    web_accessible_resources: [
      { resources: ['images/Intro-Neuron.gif'], matches: ALL_SITES_MATCH },
    ],
  },
  zip: {
    // → neuron-02.012-chrome.zip
    artifactTemplate: '{{name}}-{{versionName}}-{{browser}}.zip',
  },
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // O tipo UserManifest modela `author` como { email }, mas o Chrome aceita string
      // (campo informativo). Mantém o valor do manifest legado.
      Object.assign(manifest, { author: 'CGU - Lucas Emiliano' });

      // Chrome injeta scripts da mesma fase (run_at) na ordem do array:
      // manter a ordem legada E1..E11.
      const rank = (cs: { js?: string[] }) => {
        const name = (cs.js?.[0] ?? '')
          .replace(/^content-scripts\//, '')
          .replace(/\.js$/, '');
        const i = LEGACY_ORDER.indexOf(name);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };
      manifest.content_scripts?.sort((a, b) => rank(a) - rank(b));

      // O manifest legado não tem action.default_title (WXT deriva do <title> do popup).
      if (manifest.action && 'default_title' in manifest.action) {
        delete (manifest.action as { default_title?: string }).default_title;
      }
    },
  },
});
