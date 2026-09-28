// File: src/lib/text-placeholders.ts
//
// Fonte única de metadados sobre as chaves de substituição de texto usadas
// pelos módulos do Neuron. Cada módulo que injeta modelos de texto
// (`config.textModels.*`) substitui certos tokens por valores lidos da página
// do Fala.BR no momento da seleção. Este arquivo lista, por categoria, quais
// tokens estão disponíveis para uso nos templates — é consumido pela página de
// opções para renderizar chips informativos.
//
// Ao adicionar uma nova substituição em qualquer módulo de ouvidoria/sic,
// adicione a chave correspondente aqui e atualize a seção 4.1 do
// Manual Neuron.pdf.

import type { PlaceholderInfo, TextModelCategory } from '@/lib/types';

export const NEURON_TEXT_PLACEHOLDERS: Partial<Record<TextModelCategory, PlaceholderInfo[]>> = {
    Arquivar: [
        {
            token: '{NUP}',
            descricao: 'Número da manifestação',
            exemplo: '12345.678901/2025-11'
        }
    ],
    Encaminhar: [
        {
            token: '{OUVIDORIA}',
            descricao: 'Nome da ouvidoria destino selecionada no combo',
            exemplo: 'Ouvidoria do Ministério X'
        },
        {
            token: '{NUP}',
            descricao: 'Número da manifestação',
            exemplo: '12345.678901/2025-11'
        }
    ],
    Tramitar: [
        {
            token: '{PRAZO}',
            descricao: 'Data de tratamento interno (campo de data da tela de tramitar)',
            exemplo: '30/04/2026'
        },
        {
            token: '{SECRETARIA}',
            descricao: 'Tag da secretaria responsável (campo txtTags da manifestação)',
            exemplo: 'SDA/DIPOA'
        }
    ]
    // Prorrogar, Tratar e Resposta não possuem chaves de substituição hoje —
    // o texto do modelo é inserido sem transformações.
};
