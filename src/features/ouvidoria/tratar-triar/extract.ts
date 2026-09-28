import { isScriptAtivo, createStorageListener } from '@/lib/neuron-utils';
import type { Demanda } from '@/lib/types';

export function initExtract(): void {
    const SCRIPT_ID = 'tratarTriar';
    let observer: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const executarExtracao = async () => {
        if (!await isScriptAtivo(SCRIPT_ID)) return;

        const todosOsLinksDeNumero = document.querySelectorAll<HTMLAnchorElement>('a[id*="lvwTriagem_lnkNumero_"]');
        if (todosOsLinksDeNumero.length === 0) return;

        const manifestacoesParaProcessar: Demanda[] = [];

        todosOsLinksDeNumero.forEach(linkNumero => {
            try {
                const idCompleto = linkNumero.id;
                const indice = idCompleto.split('_').pop();

                const situacaoElement = document.getElementById(`ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao_${indice}`);
                const prazoElement = document.getElementById(`ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta_${indice}`);
                const cadastroElement = document.getElementById(`ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblDataRegistro_${indice}`);
                const urlRelativo = linkNumero.getAttribute('navigateurl');

                let iconeRespondida: Element | null = null;
                let iconeObservacao: Element | null = null;
                let todosOsResponsaveis: string[] = [];

                const primeiroRow = linkNumero.closest('.row');

                if (primeiroRow) {
                    const segundoRow = primeiroRow.nextElementSibling;
                    if (segundoRow && segundoRow.classList.contains('row')) {
                        const colunaDetalhes = segundoRow.querySelector('.coluna2dalista');
                        if (colunaDetalhes) {
                            iconeRespondida = colunaDetalhes.querySelector('em.fas.fa-check-circle[style*="green"]');
                            iconeObservacao = colunaDetalhes.querySelector('em.fas.fa-eye');

                            const itensDaLista = colunaDetalhes.querySelectorAll('li');

                            for (const item of itensDaLista) {
                                const cloneDoItem = item.cloneNode(true) as HTMLElement;
                                const iconeParaRemover = cloneDoItem.querySelector('span > span');
                                if (iconeParaRemover) {
                                    iconeParaRemover.remove();
                                }

                                todosOsResponsaveis.push(cloneDoItem.textContent.trim());
                            }
                        }
                    }
                }

                manifestacoesParaProcessar.push({
                    numero: linkNumero.innerText.trim(),
                    href: urlRelativo ? `${window.location.origin}${urlRelativo}` : null,
                    situacao: situacaoElement?.innerText.trim() || '',
                    prazo: prazoElement?.innerText.trim() || '',
                    dataCadastro: cadastroElement?.innerText.trim() || '',
                    responsaveis: todosOsResponsaveis,
                    possivelRespondida: !!iconeRespondida,
                    possivelobservacao: !!iconeObservacao,
                    idPrazoOriginal: prazoElement?.id || null,
                    idCadastroOriginal: cadastroElement?.id || null
                });
            } catch (error) {
                console.error(`%cNeuron (${SCRIPT_ID}): Erro ao extrair demanda: ${linkNumero.innerText.trim()}`, "color: red;", error);
            }
        });

        if (manifestacoesParaProcessar.length > 0) {
            const evento = new CustomEvent('dadosExtraidosNeuron', { detail: manifestacoesParaProcessar });
            document.dispatchEvent(evento);
        }
    };

    async function gerenciarEstado() {
        if (await isScriptAtivo(SCRIPT_ID)) {
            if (observer) return;
            const onMutation = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(executarExtracao, 500);
            };
            document.addEventListener('NEURON_SOLICITAR_ATUALIZACAO', executarExtracao);
            const alvo = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_upTriagem');
            if (alvo) {
                observer = new MutationObserver(onMutation);
                observer.observe(alvo, { childList: true, subtree: true });
                onMutation();
            }
        } else {
            clearTimeout(debounceTimer);
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            document.removeEventListener('NEURON_SOLICITAR_ATUALIZACAO', executarExtracao);
        }
    }

    createStorageListener(SCRIPT_ID, gerenciarEstado);
    gerenciarEstado();
}
