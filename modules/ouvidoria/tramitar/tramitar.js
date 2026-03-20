(async function () {
    'use strict';

    const SCRIPT_ID = 'tramitar';
    const CONFIG_KEY = 'neuronUserConfig';
    
    const ID_CAMPO_MENSAGEM = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtMensagem';
    const ID_CAMPO_DATA_TRATAMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtDataTratamento';
    const ID_CAMPO_TAGS_INFO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags';
    const ID_SPAN_PRAZO_ATENDIMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';
    const ID_NUMERO_MANIFESTACAO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';

    let config = {};
    let prazoInternoCalculado = '';
    let prazoOriginalStr = '';

    async function carregarConfiguracoes() {
        config = await NeuronDB.getConfig(CONFIG_KEY) || {};
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações carregadas.`, "color: blue; font-weight: bold;");
    }

    function isScriptAtivo() {
        if (!config || typeof config !== 'object') return false;
        return config.masterEnableNeuron !== false && config.modules?.[SCRIPT_ID] !== false;
    }

    function calcularData(tipoPrazo) {
        if (!window.DateUtils) return '';

        const spanPrazo = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);
        if (!spanPrazo?.innerText.trim()) return '';

        const prazoStr = spanPrazo.innerText.trim();
        const prazosSettings = config.prazosSettings || {};

        const offsetDays = parseInt(prazosSettings[tipoPrazo], 10);
        const useWorkingDays = prazosSettings.tratarNovoModoCalculo === 'diasUteis';

        const dataBase = window.DateUtils.parsearData(prazoStr);
        if (!dataBase) return '';

        const dataCalculada = useWorkingDays
            ? window.DateUtils.adicionarDiasUteis(dataBase, offsetDays)
            : window.DateUtils.adicionarDiasCorridos(dataBase, offsetDays);

        const dataFinal = window.DateUtils.ajustarDataFinal(dataCalculada);

        return window.DateUtils.formatarData(dataFinal);
    }

    function preencherCamposDeData() {
        prazoInternoCalculado = calcularData('tratarNovoPrazoInternoDias');
        const spanPrazo = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);
        prazoOriginalStr = spanPrazo?.innerText.trim() || '';

        const campoDataTratamento = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        if (campoDataTratamento && !campoDataTratamento.value.trim()) {
            campoDataTratamento.value = prazoInternoCalculado;
        }
    }

    function atualizarPainelPrazos() {
        const painel = document.getElementById('neuronPainelPrazos');
        if (!painel || !window.DateUtils) return;

        const DU = window.DateUtils;

        const linhaOriginal = painel.querySelector('[data-neuron-prazo="original"]');
        if (linhaOriginal && prazoOriginalStr) {
            const dataOriginal = DU.parsearData(prazoOriginalStr);
            const diasOriginal = dataOriginal ? DU.calcularDiasRestantes(dataOriginal) : '';
            linhaOriginal.textContent = '';
            const boldOrig = document.createElement('strong');
            boldOrig.textContent = 'Prazo Original: ';
            linhaOriginal.appendChild(boldOrig);
            linhaOriginal.appendChild(document.createTextNode(prazoOriginalStr + ' '));
            const spanDiasOrig = document.createElement('span');
            spanDiasOrig.className = 'neuron-prazo-dias';
            spanDiasOrig.textContent = diasOriginal;
            linhaOriginal.appendChild(spanDiasOrig);
        }

        const linhaInterno = painel.querySelector('[data-neuron-prazo="interno"]');
        if (!linhaInterno) return;

        const campoDataTratamento = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        const valorAtual = campoDataTratamento?.value?.trim() || '';
        const foiAlterado = valorAtual !== '' && valorAtual !== prazoInternoCalculado;
        const dataExibir = valorAtual || prazoInternoCalculado;
        const label = foiAlterado ? 'Prazo Interno: ' : 'Possível Prazo Interno: ';

        const dataParsed = DU.parsearData(dataExibir);
        const diasRestantes = dataParsed ? DU.calcularDiasRestantes(dataParsed) : '';

        linhaInterno.textContent = '';
        const boldInt = document.createElement('strong');
        boldInt.textContent = label;
        linhaInterno.appendChild(boldInt);
        linhaInterno.appendChild(document.createTextNode(dataExibir + ' '));
        const spanDiasInt = document.createElement('span');
        spanDiasInt.className = 'neuron-prazo-dias';
        spanDiasInt.textContent = diasRestantes;
        linhaInterno.appendChild(spanDiasInt);
    }

    async function salvarPrazoInternoManual() {
        const numero = document.getElementById(ID_NUMERO_MANIFESTACAO)?.innerText.trim();
        if (!numero) return;

        const campoDataTratamento = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        const valorAtual = campoDataTratamento?.value?.trim() || '';

        const overrides = await NeuronDB.getConfig('neuronPrazosOverrides') || {};
        if (valorAtual && valorAtual !== prazoInternoCalculado) {
            overrides[numero] = valorAtual;
        } else {
            delete overrides[numero];
        }
        await NeuronDB.setConfig('neuronPrazosOverrides', overrides);
    }

    function onCampoDataAlterado() {
        atualizarPainelPrazos();
        salvarPrazoInternoManual();
    }

    function criarPainelPrazos(containerRef) {
        if (!prazoOriginalStr) return;

        const painel = document.createElement('div');
        painel.id = 'neuronPainelPrazos';

        const linhaOriginal = document.createElement('div');
        linhaOriginal.dataset.neuronPrazo = 'original';
        painel.appendChild(linhaOriginal);

        const linhaInterno = document.createElement('div');
        linhaInterno.dataset.neuronPrazo = 'interno';
        linhaInterno.className = 'neuron-prazo-interno';
        painel.appendChild(linhaInterno);

        containerRef.insertAdjacentElement('beforebegin', painel);

        atualizarPainelPrazos();

        const campoDataTratamento = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        if (campoDataTratamento) {
            campoDataTratamento.addEventListener('input', onCampoDataAlterado);
            campoDataTratamento.addEventListener('change', onCampoDataAlterado);
        }
    }

    function criarOuAtualizarUI() {
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        if (!mensagemField) return;

        removerElementosCriados();
        preencherCamposDeData();
        criarPainelPrazos(mensagemField);
        salvarPrazoInternoManual();

        const modelos = config.textModels?.Tramitar;
        if (!modelos || Object.keys(modelos).length === 0) {
            return;
        }

        const selectContainer = document.createElement('div');
        selectContainer.id = 'neuronSelectMensagensTramitarContainer';
        selectContainer.className = 'form-group';
        
        const selectElement = document.createElement('select');
        selectElement.id = 'neuronSelectMensagensTramitar';
        selectElement.className = 'form-control';
        
        selectElement.innerHTML = '<option value="">Fala.BR CGU - Neuron: Selecione um modelo de mensagem...</option>';

        Object.keys(modelos).sort().forEach(chave => {
            const option = document.createElement('option');
            option.value = chave;
            option.textContent = chave;
            selectElement.appendChild(option);
        });

        selectElement.addEventListener('change', function () {
            if (!this.value) {
                mensagemField.value = '';
                return;
            }
            const dataLimite = document.getElementById(ID_CAMPO_DATA_TRATAMENTO)?.value || ''; 
            const secretariaTag = document.getElementById(ID_CAMPO_TAGS_INFO)?.value || '{SECRETARIA}';
            
            let templateText = modelos[this.value] || '';
            templateText = templateText.replace(/\{SECRETARIA\}/g, secretariaTag);
            templateText = templateText.replace(/\{PRAZO\}/g, dataLimite);
            mensagemField.value = templateText;
        });
        
        selectContainer.appendChild(selectElement);
        mensagemField.parentNode.insertBefore(selectContainer, mensagemField);
    }

    function removerElementosCriados() {
        const campoDataTratamento = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        if (campoDataTratamento) {
            campoDataTratamento.removeEventListener('input', onCampoDataAlterado);
            campoDataTratamento.removeEventListener('change', onCampoDataAlterado);
        }
        document.getElementById('neuronPainelPrazos')?.remove();
        document.getElementById('neuronSelectMensagensTramitarContainer')?.remove();
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();

        if (window.DateUtils?.ready && typeof window.DateUtils.ready.then === 'function') {
            await window.DateUtils.ready;
        }

        if (isScriptAtivo()) {
            criarOuAtualizarUI();
        } else {
            removerElementosCriados();
        }
    }
    
    NeuronSync.onConfigChange((key) => {
        if (key === CONFIG_KEY) {
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        await verificarEstadoAtualEAgir();
    }

    init();

})();