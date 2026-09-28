/**
 * @file date-utils.ts
 * @version 4.0 (Sincronização com Promise)
 * @description Módulo central para operações de data que expõe uma Promise 'ready' 
 * para sinalizar quando as configurações foram carregadas.
 */

import { NeuronDB } from './neuron-db';
import type { Holiday, PrazoAjusteFds, PrazoAjusteFeriado } from '@/lib/types';

/** Regras globais de ajuste (carregadas de prazosSettings). */
interface GlobalRules {
    weekend?: PrazoAjusteFds;
    holiday?: PrazoAjusteFeriado;
}

/** Overrides opcionais aceitos por ajustarDataFinal. */
export interface AjusteRuleOverrides {
    ajusteFds?: PrazoAjusteFds;
    ajusteFeriado?: PrazoAjusteFeriado;
}

let holidays: Holiday[] = [];
let globalRules: GlobalRules = {};
let readyPromise: Promise<void> | null = null;

/**
 * Carrega as configurações e, ao final, resolve a Promise 'ready'.
 */
async function carregarConfiguracoes(): Promise<void> {
    try {
        const config = await NeuronDB.getConfig('neuronUserConfig');
        if (config) {

            globalRules.weekend = config.prazosSettings?.tratarNovoAjusteFds || 'modo1';
            globalRules.holiday = config.prazosSettings?.tratarNovoAjusteFeriado || 'proximo_dia';
            holidays = Array.isArray(config.holidays) ? config.holidays : [];

            console.log("DATE_UTILS v4.0: Regras e feriados carregados.", { globalRules, holidays: holidays.length });
        } else {
            console.warn("DATE_UTILS v4.0: Configuração não encontrada. Usando valores padrão.");
            globalRules.weekend = 'modo1';
            globalRules.holiday = 'proximo_dia';
            holidays = [];
        }
    } catch (error) {
        console.error("DATE_UTILS: Falha crítica ao carregar configurações.", error);
        // Set safe defaults on error
        globalRules.weekend = 'modo1';
        globalRules.holiday = 'proximo_dia';
        holidays = [];
    }
}

/**
 * Inicia o carregamento das configurações (apenas uma vez) e devolve a Promise 'ready'.
 * Chamadas concorrentes reutilizam a mesma Promise.
 * A Promise devolvida resolve ao fim do carregamento, com sucesso ou falha.
 */
function init(): Promise<void> {
    return (readyPromise ??= carregarConfiguracoes());
}

function parsearData(str: string | null | undefined): Date | null {
    if (!str || !/^\d{2}\/\d{2}\/\d{4}/.test(str)) return null;
    const [dia, mes, ano] = str.split('/');
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
}

function formatarData(date: Date): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Data inválida';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function isFeriado(date: Date): boolean {
    return holidays.some(f => f.date === formatarData(date));
}

function ajustarFds(dataAjustada: Date, fdsRule: PrazoAjusteFds | undefined): void {
    const diaDaSemana = dataAjustada.getDay();
    if (diaDaSemana === 6) { // Sábado
        if (fdsRule === 'modo1' || fdsRule === 'modo3') dataAjustada.setDate(dataAjustada.getDate() - 1);
        else if (fdsRule === 'modo2') dataAjustada.setDate(dataAjustada.getDate() + 2);
    } else if (diaDaSemana === 0) { // Domingo
        if (fdsRule === 'modo2' || fdsRule === 'modo3') dataAjustada.setDate(dataAjustada.getDate() + 1);
        else if (fdsRule === 'modo1') dataAjustada.setDate(dataAjustada.getDate() - 2);
    }
}

function ajustarDataFinal(data: Date, ruleOverrides: AjusteRuleOverrides = {}): Date {
    let dataAjustada = new Date(data.valueOf());

    const fdsRule = ruleOverrides.ajusteFds || globalRules.weekend;
    const holidayRule = ruleOverrides.ajusteFeriado || globalRules.holiday;

    let tentativas = 0;
    const maxTentativas = 30;

    // Combined loop: adjust weekends and holidays until stable
    do {
        if (fdsRule !== 'none') {
            ajustarFds(dataAjustada, fdsRule);
        }

        if (holidayRule !== 'none' && isFeriado(dataAjustada)) {
            dataAjustada.setDate(dataAjustada.getDate() + (holidayRule === 'dia_anterior' ? -1 : 1));
        } else {
            break;
        }

        tentativas++;
    } while (tentativas < maxTentativas);

    if (tentativas >= maxTentativas) {
        console.warn('DATE_UTILS: Limite de tentativas atingido ao ajustar data. Retornando data sem ajuste completo.');
    }

    return dataAjustada;
}

function adicionarDiasCorridos(dataInicial: Date, dias: number): Date {
    const novaData = new Date(dataInicial.valueOf());
    novaData.setDate(novaData.getDate() + dias);
    return novaData;
}

function adicionarDiasUteis(dataInicial: Date, dias: number): Date {
    let novaData = new Date(dataInicial.valueOf());
    let diasAdicionados = 0;
    let tentativas = 0;
    const maxTentativas = Math.abs(dias) * 7; // Maximum attempts (worst case: 7 days for each business day)
    const direcao = dias > 0 ? 1 : -1;

    while (diasAdicionados < Math.abs(dias) && tentativas < maxTentativas) {
        novaData.setDate(novaData.getDate() + direcao);
        tentativas++;
        
        const diaDaSemana = novaData.getDay();
        if (diaDaSemana !== 0 && diaDaSemana !== 6 && !isFeriado(novaData)) {
            diasAdicionados++;
        }
    }
    
    if (tentativas >= maxTentativas) {
        console.warn('DATE_UTILS: Limite de tentativas atingido ao calcular dias úteis. Resultado pode estar incompleto.');
    }
    
    return novaData;
}

function calcularDiasRestantes(dataAlvo: Date | string | null | undefined): string {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataFinal = (dataAlvo instanceof Date) ? new Date(dataAlvo.valueOf()) : parsearData(dataAlvo);
    if (!dataFinal) return '';
    dataFinal.setHours(0, 0, 0, 0);
    const diffTime = dataFinal.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '(Hoje)';
    if (diffDays === 1) return '(Amanhã)';
    if (diffDays === -1) return '(Ontem)';
    if (diffDays > 1) return `(em ${diffDays} dias)`;
    return `(${Math.abs(diffDays)} dias atrás)`;
}

// Exporta a Promise 'ready' junto com as outras funções.
export const DateUtils = {
    init,
    get ready(): Promise<void> { return init(); },
    parsearData,
    formatarData,
    adicionarDiasCorridos,
    adicionarDiasUteis,
    ajustarDataFinal,
    calcularDiasRestantes
};
