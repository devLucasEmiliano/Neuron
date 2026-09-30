#!/usr/bin/env node
/**
 * Compara o manifest legado (tag wxt-migration-base) com o manifest gerado pelo WXT
 * (.output/chrome-mv3/manifest.json, build de PRODUÇÃO — o build de dev adiciona
 * permissões/CSP e não deve ser comparado).
 *
 * Uso: bun run build && node scripts/compare-manifest.mjs
 * Sai com código 1 se houver diferença não esperada.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LEGACY_REF = process.argv[2] ?? 'wxt-migration-base';
const NEW_PATH = resolve(process.argv[3] ?? '.output/chrome-mv3/manifest.json');

/** Nome do bundle esperado para cada entrada legada, na ordem do manifest antigo. */
const EXPECTED_NAMES = [
  'loading', 'notificacoes', 'tratar-triar', 'arquivar', 'encaminhar',
  'prorrogar', 'tramitar', 'tratar', 'resposta', 'sic-tratar', 'sic-analisar',
];

/** Origem do Supabase presente no manifest legado; removida em 02.013 junto com a aba Melhorias. */
const SUPABASE_HOST = 'https://nbtsggaahglmshtkbxwv.supabase.co/*';

const oldManifest = JSON.parse(
  execFileSync('git', ['show', `${LEGACY_REF}:manifest.json`], { encoding: 'utf8' }),
);
const newManifest = JSON.parse(readFileSync(NEW_PATH, 'utf8'));

const problems = [];
const expected = [];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (arr) => [...arr].sort();

// 1. Campos que devem ser idênticos
for (const key of ['manifest_version', 'name', 'version', 'description', 'author', 'permissions']) {
  if (!same(oldManifest[key], newManifest[key])) {
    problems.push(`${key}: legado=${JSON.stringify(oldManifest[key])} novo=${JSON.stringify(newManifest[key])}`);
  }
}
// version_name: a única diferença aceita é o bump 02.012 → 02.013 (remoção da aba Melhorias/Supabase)
if (oldManifest.version_name === '02.012' && newManifest.version_name === '02.013') {
  expected.push(`version_name: ${oldManifest.version_name} → ${newManifest.version_name}`);
} else if (!same(oldManifest.version_name, newManifest.version_name)) {
  problems.push(`version_name: legado=${JSON.stringify(oldManifest.version_name)} novo=${JSON.stringify(newManifest.version_name)}`);
}
// host_permissions: o legado inclui a origem Supabase, removida em 02.013
const oldHosts = oldManifest.host_permissions ?? [];
const newHosts = newManifest.host_permissions ?? [];
const expectedHosts = oldHosts.filter((h) => h !== SUPABASE_HOST);
if (!same(sorted(expectedHosts), sorted(newHosts))) {
  problems.push(`host_permissions: legado=${JSON.stringify(oldHosts)} novo=${JSON.stringify(newHosts)} (esperado ${JSON.stringify(expectedHosts)})`);
} else if (expectedHosts.length !== oldHosts.length) {
  expected.push('host_permissions: origem Supabase removida (02.013)');
}
if (oldManifest.options_ui?.open_in_tab !== newManifest.options_ui?.open_in_tab) {
  problems.push(`options_ui.open_in_tab: legado=${oldManifest.options_ui?.open_in_tab} novo=${newManifest.options_ui?.open_in_tab}`);
}
if (newManifest.background?.service_worker !== 'background.js') {
  problems.push(`background.service_worker: novo=${newManifest.background?.service_worker} (esperado background.js)`);
}

// 2. Diferenças esperadas de caminho
const expectPath = (label, oldVal, newVal, want) => {
  if (newVal === want) expected.push(`${label}: ${oldVal} → ${newVal}`);
  else problems.push(`${label}: novo=${newVal} (esperado ${want}; legado ${oldVal})`);
};
expectPath('icons.128', oldManifest.icons?.['128'], newManifest.icons?.['128'], 'icon/128.png');
expectPath('action.default_icon.128', oldManifest.action?.default_icon?.['128'], newManifest.action?.default_icon?.['128'], 'icon/128.png');
expectPath('action.default_popup', oldManifest.action?.default_popup, newManifest.action?.default_popup, 'popup.html');
expectPath('options_ui.page', oldManifest.options_ui?.page, newManifest.options_ui?.page, 'options.html');
if ('default_title' in (newManifest.action ?? {})) {
  problems.push(`action.default_title presente no novo manifest (${newManifest.action.default_title}); o legado não tem`);
}

// 3. content_scripts: mesma quantidade, mesma ordem, mesmos matches/run_at, 1 js e (0|1) css
const oldCs = oldManifest.content_scripts ?? [];
const newCs = newManifest.content_scripts ?? [];
if (oldCs.length !== newCs.length) {
  problems.push(`content_scripts.length: legado=${oldCs.length} novo=${newCs.length}`);
}
for (let i = 0; i < Math.max(oldCs.length, newCs.length); i++) {
  const o = oldCs[i];
  const n = newCs[i];
  const tag = `content_scripts[${i}] (${EXPECTED_NAMES[i] ?? '?'})`;
  if (!o || !n) continue;
  if (!same(sorted(o.matches), sorted(n.matches))) {
    problems.push(`${tag}.matches: legado=${JSON.stringify(o.matches)} novo=${JSON.stringify(n.matches)}`);
  }
  const oRun = o.run_at ?? 'document_idle';
  const nRun = n.run_at ?? 'document_idle';
  if (oRun !== nRun) problems.push(`${tag}.run_at: legado=${oRun} novo=${nRun}`);
  const wantJs = `content-scripts/${EXPECTED_NAMES[i]}.js`;
  if (!(n.js?.length === 1 && n.js[0] === wantJs)) {
    problems.push(`${tag}.js: novo=${JSON.stringify(n.js)} (esperado [${wantJs}])`);
  } else {
    expected.push(`${tag}.js: ${o.js?.length ?? 0} arquivos → ${wantJs}`);
  }
  const oCss = o.css?.length ?? 0;
  const nCss = n.css?.length ?? 0;
  if ((oCss > 0) !== (nCss === 1) && !(oCss === 0 && nCss === 0)) {
    problems.push(`${tag}.css: legado=${oCss} arquivos novo=${JSON.stringify(n.css)}`);
  } else if (oCss > 0) {
    expected.push(`${tag}.css: ${oCss} arquivos → ${n.css[0]}`);
  }
}

// 4. web_accessible_resources: mesmos matches; resources reduzido ao gif (intencional)
const oldWar = oldManifest.web_accessible_resources?.[0];
const newWar = newManifest.web_accessible_resources?.[0];
if (!same(sorted(oldWar?.matches ?? []), sorted(newWar?.matches ?? []))) {
  problems.push(`web_accessible_resources.matches: legado=${JSON.stringify(oldWar?.matches)} novo=${JSON.stringify(newWar?.matches)}`);
}
if (same(newWar?.resources, ['images/Intro-Neuron.gif'])) {
  expected.push(`web_accessible_resources.resources: ${JSON.stringify(oldWar?.resources)} → ["images/Intro-Neuron.gif"]`);
} else {
  problems.push(`web_accessible_resources.resources: novo=${JSON.stringify(newWar?.resources)} (esperado ["images/Intro-Neuron.gif"])`);
}

// 5. Nenhuma chave inesperada no novo manifest
const knownKeys = new Set([...Object.keys(oldManifest), 'background']);
for (const key of Object.keys(newManifest)) {
  if (!knownKeys.has(key)) problems.push(`chave inesperada no novo manifest: ${key}`);
}

console.log('Diferenças esperadas:');
for (const e of expected) console.log('  ✓ ' + e);
if (problems.length) {
  console.log('\nDiferenças NÃO esperadas:');
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log('\nManifest OK: paridade com o legado (' + LEGACY_REF + ').');
