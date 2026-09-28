/**
 * Hosts do Fala.BR e helpers de match pattern.
 * Módulo puro (sem dependências, sem `browser`): é importado por wxt.config.ts
 * antes do runtime do WXT existir, além de pelos entrypoints.
 */
export const SITE_HOSTS = {
  producao: 'falabr.cgu.gov.br',
  treinamento: 'treinafalabr.cgu.gov.br',
  homologacao: 'falabr-h.cgu.gov.br',
} as const;

export const SITE_LABELS = {
  producao: 'PROD',
  treinamento: 'TREINA',
  homologacao: 'HOMOLOG',
} as const;

export const SUPABASE_ORIGIN = 'https://nbtsggaahglmshtkbxwv.supabase.co';

/** `https://<host>/*` para os 3 hosts, na ordem legada do manifest. */
export const ALL_SITES_MATCH: string[] = Object.values(SITE_HOSTS).map((h) => `https://${h}/*`);

/** falabr('/x?*') → mesmo path nos 3 hosts, na ordem legada do manifest. */
export const falabr = (path: string): string[] =>
  Object.values(SITE_HOSTS).map((h) => `https://${h}${path}`);
