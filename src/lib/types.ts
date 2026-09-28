/**
 * Tipos compartilhados do Neuron.
 *
 * Fonte única para as formas de dados que circulam entre os módulos:
 * configuração do usuário (config.json), demandas extraídas do Fala.BR,
 * chaves/valores do chrome.storage.local, contratos dos módulos de conteúdo,
 * Supabase (mural de melhorias) e eventos customizados do documento.
 *
 * Módulo puro: apenas tipos e type guards, sem efeitos colaterais.
 */

import type { SITE_HOSTS } from './sites';

// ============================================================================
// Sites (ambientes do Fala.BR)
// ============================================================================

/** Alias de ambiente. Deve coincidir com as chaves de SITE_HOSTS (src/lib/sites.ts). */
export type SiteAlias = 'producao' | 'treinamento' | 'homologacao';

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
// Garantia em tempo de compilação: SiteAlias e keyof SITE_HOSTS não podem divergir.
type _SiteAliasMatchesSiteHosts = Assert<MutuallyAssignable<SiteAlias, keyof typeof SITE_HOSTS>>;

const SITE_ALIASES: readonly SiteAlias[] = ['producao', 'treinamento', 'homologacao'];

// ============================================================================
// Módulos / scripts
// ============================================================================

/** Chaves de `config.modules` em config.json (toggles expostos na página de opções). */
export type ModuleToggleId = 'notificacoes' | 'prazos' | 'respostas' | 'modelos' | 'pontosFocais';

/** IDs usados pelos content scripts (scriptId / SCRIPT_ID). */
export type ScriptId =
  | 'loading'
  | 'notificacoes'
  | 'tratarTriar'
  | 'arquivar'
  | 'encaminhar'
  | 'prorrogar'
  | 'tratar'
  | 'tramitar'
  | 'tramitar_pontos_focais'
  | 'resposta';

/**
 * `config.modules`. Os módulos consultam `config.modules?.[scriptId] !== false`
 * com ScriptIds que NÃO existem em config.json (ex.: 'arquivar') — a chave
 * ausente resulta em `undefined` (ativo). O index signature preserva esse
 * comportamento legado.
 */
export type ModuleToggles = Partial<Record<ModuleToggleId, boolean>> & Record<string, boolean | undefined>;

// ============================================================================
// Configuração do usuário (config.json)
// ============================================================================

export interface GeneralSettings {
  qtdItensTratarTriar: number;
  limiteCaracteresArquivar: number;
}

export interface NotificacoesCategoryVisibility {
  prazosCurtos: boolean;
  possiveisRespondidas: boolean;
  comObservacao: boolean;
  prorrogadas: boolean;
  complementadas: boolean;
}

export interface NotificacoesSettings {
  deadlineThreshold: number;
  dangerCountThreshold: number;
  filterDefault: boolean;
  categoryVisibility: NotificacoesCategoryVisibility;
}

/** Valores do <select id="tratarNovoModoCalculo"> em options.html. */
export type PrazoModoCalculo = 'diasCorridos' | 'diasUteis';
/** Valores do <select id="tratarNovoAjusteFds"> (ver date-utils: ajustarFds). */
export type PrazoAjusteFds = 'modo1' | 'modo2' | 'modo3' | 'none';
/** Valores do <select id="tratarNovoAjusteFeriado"> (ver date-utils: ajustarDataFinal). */
export type PrazoAjusteFeriado = 'proximo_dia' | 'dia_anterior' | 'none';

export interface PrazosSettings {
  tratarNovoModoCalculo: PrazoModoCalculo;
  tratarNovoAjusteFds: PrazoAjusteFds;
  tratarNovoAjusteFeriado: PrazoAjusteFeriado;
  tratarNovoPrazoInternoDias: number;
  tratarNovoCobrancaInternaDias: number;
}

export interface Holiday {
  /** DD/MM/YYYY */
  date: string;
  description: string;
}

/** Modelo da categoria Encaminhar: dois textos (destinatário e solicitante). */
export type EncaminharTextModel = {
  destinatario: string;
  solicitante: string;
};

/** `config.textModels` — chave interna = nome do modelo exibido no dropdown. */
export type TextModels = {
  Arquivar: Record<string, string>;
  Prorrogar: Record<string, string>;
  Encaminhar: Record<string, EncaminharTextModel>;
  Tramitar: Record<string, string>;
  Tratar: Record<string, string>;
};

export type TextModelCategory = keyof TextModels;

const TEXT_MODEL_CATEGORIES: readonly TextModelCategory[] = [
  'Arquivar',
  'Prorrogar',
  'Encaminhar',
  'Tramitar',
  'Tratar',
];

export interface DefaultResponseOption {
  text: string;
  conteudoTextarea: string;
  responsavel: string;
}

export interface DefaultResponseGroup {
  novoDropdownOptions: DefaultResponseOption[];
}

/** `config.defaultResponses` — chave = tipo de resposta (ex.: "Resposta Conclusiva"). */
export type DefaultResponses = Record<string, DefaultResponseGroup>;

/** `config.focalPoints` — chave = sigla da secretaria; valor = nomes dos pontos focais. */
export type FocalPoints = Record<string, string[]>;

/**
 * Configuração completa do usuário (chave 'neuronUserConfig' no bucket neuron_config).
 * Tudo opcional: o JSON salvo pode ser parcial (edição bruta / import) e os
 * módulos sempre aplicam fallbacks.
 */
export interface NeuronUserConfig {
  configVersion?: string;
  masterEnableNeuron?: boolean;
  modules?: ModuleToggles;
  generalSettings?: Partial<GeneralSettings>;
  notificacoesSettings?: Partial<Omit<NotificacoesSettings, 'categoryVisibility'>> & { categoryVisibility?: Partial<NotificacoesCategoryVisibility> };
  prazosSettings?: Partial<PrazosSettings>;
  holidays?: Holiday[];
  textModels?: Partial<TextModels>;
  defaultResponses?: DefaultResponses;
  focalPoints?: FocalPoints;
}

// ============================================================================
// Demandas (extraídas da tela Tratar/Triar)
// ============================================================================

/** Registro produzido por tratar-novo-extract.js e emitido em 'dadosExtraidosNeuron'. */
export interface Demanda {
  numero: string;
  href: string | null;
  situacao: string;
  /** DD/MM/YYYY (ou '' quando ausente) */
  prazo: string;
  /** DD/MM/YYYY (ou '' quando ausente) */
  dataCadastro: string;
  responsaveis: string[];
  possivelRespondida: boolean;
  /** sic: "o" minúsculo — precisa bater com os dados já persistidos */
  possivelobservacao: boolean;
  idPrazoOriginal: string | null;
  idCadastroOriginal: string | null;
}

/** Demanda como persistida pelo NeuronDB (timestamps calculados em prepareDemanda). */
export interface DemandaStored extends Demanda {
  prazoTimestamp: number | null;
  cadastroTimestamp: number | null;
}

// ============================================================================
// Tema
// ============================================================================

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

// ============================================================================
// Storage (chrome.storage.local)
// ============================================================================

/** Bucket global 'neuron_config'. */
export interface ConfigBucket {
  neuronUserConfig?: NeuronUserConfig;
  /** numero da manifestação → prazo interno (DD/MM/YYYY) definido manualmente em Tramitar */
  neuronPrazosOverrides?: Record<string, string>;
}

export type DashboardFilter = 'all' | 'mine';

const DASHBOARD_FILTERS: readonly DashboardFilter[] = ['all', 'mine'];

/** Bucket global 'neuron_preferences'. */
export interface Preferences {
  theme?: ThemePreference;
  themeEnabled?: boolean;
  filtroUsuarioAtivado?: boolean;
  /** Date.now() gravado ao limpar a lista (sinal para o dashboard recarregar) */
  dashboardRefreshSignal?: number;
  secretariaSelecionadaTramitar?: string;
  dashboardFilter?: DashboardFilter;
  dashboardItemsPerPage?: number;
}

/** Bucket por site 'neuron_<site>_metadata'. */
export interface SiteMetadata {
  currentUser?: string;
}

export type DemandasStorageKey = `neuron_${SiteAlias}_demandas`;
export type ConcluidasStorageKey = `neuron_${SiteAlias}_concluidas`;
export type MetadataStorageKey = `neuron_${SiteAlias}_metadata`;

/** Chaves por site (neuron_<site>_demandas | _concluidas | _metadata), uma por SiteAlias. */
export type PerSiteStorageSchema = {
  [K in SiteAlias as `neuron_${K}_demandas`]: Record<string, DemandaStored>;
} & {
  [K in SiteAlias as `neuron_${K}_concluidas`]: string[];
} & {
  [K in SiteAlias as `neuron_${K}_metadata`]: SiteMetadata;
};

/** Mapa completo chave → valor do chrome.storage.local usado pela extensão. */
export interface StorageSchema extends PerSiteStorageSchema {
  neuron_config: ConfigBucket;
  neuron_preferences: Preferences;
  neuron_supabase_session: SupabaseSession;
  /** flag da migração para chaves por site (background) */
  neuron_storage_v2: boolean;
}

export type StorageKey = keyof StorageSchema;

// ============================================================================
// Estatísticas (NeuronDB.getStats)
// ============================================================================

export interface PrazoRangeCounts {
  /** < 0 dias */
  atrasadas: number;
  /** 0-2 dias */
  urgentes: number;
  /** 3-7 dias */
  proximas: number;
  /** > 7 dias */
  normais: number;
}

export interface ResponsavelCount {
  name: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  pendentes: number;
  concluidas: number;
  taxaConclusao: number;
  prazosCurtos: number;
  atrasadas: number;
  prorrogadas: number;
  complementadas: number;
  possivelRespondida: number;
  possivelobservacao: number;
  byResponsavel: Record<string, number>;
  topResponsaveis: ResponsavelCount[];
  byPrazoRange: PrazoRangeCounts;
  demandas: DemandaStored[];
  concluidasSet: Set<string>;
}

// ============================================================================
// Módulos de conteúdo (module-factory)
// ============================================================================

export interface NeuronModuleContext {
  config: NeuronUserConfig;
  log: (message: string, color?: string) => void;
}

export interface NeuronModuleOptions {
  scriptId: ScriptId;
  configKey: 'neuronUserConfig';
  onScriptAtivo: (ctx: NeuronModuleContext) => void;
  onScriptInativo: () => void;
  onConfigChange?: () => void;
}

// ============================================================================
// Sincronização (NeuronSync)
// ============================================================================

/** Callback de NeuronSync.onConfigChange: (chave do bucket, novo valor). */
export type ConfigChangeListener = (key: string, newValue: unknown) => void;
/** Callback de NeuronSync.onPreferenceChange: mesma assinatura. */
export type PreferenceChangeListener = ConfigChangeListener;

// ============================================================================
// Supabase (mural de melhorias)
// ============================================================================

/** Sessão anônima persistida em 'neuron_supabase_session'. */
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  /** epoch em segundos */
  expires_at: number;
  user_id: string | undefined;
}

/** Categorias do <select id="suggestionCategory"> (melhoria.js: CATEGORIES). */
export type SuggestionCategory =
  | 'bug'
  | 'nova_ferramenta'
  | 'melhoria_ux'
  | 'documentacao'
  | 'performance'
  | 'outro';

/** Linha da tabela `suggestions`. */
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: SuggestionCategory;
  vote_count: number;
  /** ISO 8601 */
  created_at: string;
  author_id?: string;
}

/** Linha da tabela `votes` (getMyVotes seleciona apenas suggestion_id). */
export interface Vote {
  suggestion_id: string;
  voter_id?: string;
  created_at?: string;
}

export interface CreateSuggestionInput {
  title: string;
  description: string;
  category: SuggestionCategory;
}

// ============================================================================
// Placeholders de texto (text-placeholders)
// ============================================================================

export interface PlaceholderInfo {
  token: string;
  descricao: string;
  exemplo: string;
}

// ============================================================================
// Eventos customizados do documento
// ============================================================================

declare global {
  interface DocumentEventMap {
    dadosExtraidosNeuron: CustomEvent<Demanda[]>;
    'NEURON_SOLICITAR_ATUALIZACAO': CustomEvent<null>;
    'neuron-theme-change': CustomEvent<{ theme: ResolvedTheme; preference: ThemePreference }>;
    'neuron-theme-enabled-change': CustomEvent<{ enabled: boolean }>;
  }
}

// ============================================================================
// Type guards
// ============================================================================

export function isSiteAlias(value: unknown): value is SiteAlias {
  return typeof value === 'string' && (SITE_ALIASES as readonly string[]).includes(value);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function isDashboardFilter(value: unknown): value is DashboardFilter {
  return typeof value === 'string' && (DASHBOARD_FILTERS as readonly string[]).includes(value);
}

export function isTextModelCategory(value: unknown): value is TextModelCategory {
  return typeof value === 'string' && (TEXT_MODEL_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Espelha a validação de import da página de opções: um objeto com `modules`
 * (truthy) ou com `masterEnableNeuron` definido é aceito como configuração.
 */
export function isNeuronUserConfigLike(value: unknown): value is NeuronUserConfig {
  if (typeof value !== 'object' || value === null) return false;
  const hasModules = 'modules' in value && !!value.modules;
  const hasMasterEnable = 'masterEnableNeuron' in value && value.masterEnableNeuron !== undefined;
  return hasModules || hasMasterEnable;
}
