"""Atualiza o Manual Neuron.pdf inserindo uma nova subseção 4.1
"Chaves de Substituição de Texto" após o fim da seção 4 (Modelos de Texto).

Estratégia:
1. Gera um PDF temporário com as novas páginas usando reportlab (mesmo estilo
   visual do documento original, que também foi gerado com reportlab).
2. Mescla com o PDF original inserindo as novas páginas após a página 12
   (fim da seção "Modelos de Texto").
3. Salva sobrescrevendo o arquivo original.

O original permanece rastreado por git, então funciona como backup.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "Manual Neuron.pdf"
INSERT_AFTER_PAGE = 12  # páginas 1-indexadas; insere após a página 12 (fim seção 4)

NEURON_PRIMARY = colors.HexColor("#0d6efd")
NEURON_LIGHT = colors.HexColor("#e7f1ff")
NEURON_ACCENT = colors.HexColor("#6610f2")
BODY_GREY = colors.HexColor("#495057")


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(BODY_GREY)
    canvas.drawString(2 * cm, 1.2 * cm, "Fala.BR CGU - Neuron    Manual do Usuário")
    canvas.drawRightString(
        A4[0] - 2 * cm, 1.2 * cm, f"Página {doc.page}"
    )
    canvas.restoreState()


def build_new_pages() -> bytes:
    """Gera um PDF em memória com a nova subseção de chaves de substituição."""
    buf = io.BytesIO()
    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Chaves de Substituição de Texto",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="normal",
    )
    doc.addPageTemplates(
        [PageTemplate(id="with-footer", frames=frame, onPage=_footer)]
    )

    styles = getSampleStyleSheet()
    h_section = ParagraphStyle(
        "HSection",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=NEURON_PRIMARY,
        spaceAfter=12,
    )
    h_sub = ParagraphStyle(
        "HSub",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=NEURON_ACCENT,
        spaceBefore=14,
        spaceAfter=8,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=BODY_GREY,
        spaceAfter=8,
    )
    body_cell = ParagraphStyle(
        "BodyCell",
        parent=body,
        spaceAfter=0,
        leading=12,
    )
    mono_cell = ParagraphStyle(
        "MonoCell",
        parent=body_cell,
        fontName="Courier-Bold",
        textColor=NEURON_PRIMARY,
    )
    callout = ParagraphStyle(
        "Callout",
        parent=body,
        backColor=NEURON_LIGHT,
        borderColor=NEURON_PRIMARY,
        borderWidth=0.5,
        borderPadding=8,
        leftIndent=0,
        rightIndent=0,
        spaceBefore=6,
        spaceAfter=10,
    )

    story = []

    story.append(Paragraph("4.1&nbsp;&nbsp;Chaves de Substituição de Texto", h_section))
    story.append(
        Paragraph(
            "Os modelos de texto aceitam <b>chaves de substituição</b> — marcadores "
            "entre chaves (<code>{CHAVE}</code>) que são automaticamente substituídos "
            "por valores lidos da manifestação no momento em que o modelo é inserido no "
            "Fala.BR. Isso permite criar templates reutilizáveis que se adaptam a cada "
            "demanda sem edição manual.",
            body,
        )
    )
    story.append(
        Paragraph(
            "As chaves disponíveis dependem da categoria do modelo (Arquivar, "
            "Encaminhar, Tramitar, etc.). Na página de opções, em <b>Modelos de Texto</b>, "
            "um painel no topo da lista mostra os chips de todas as chaves disponíveis "
            "para a categoria selecionada — <b>clique em qualquer chip para copiar a "
            "chave para a área de transferência</b> e colá-la no conteúdo do modelo.",
            body,
        )
    )

    story.append(Paragraph("Chaves por Categoria", h_sub))

    header_style = ParagraphStyle(
        "HeaderCell",
        parent=body_cell,
        fontName="Helvetica-Bold",
        textColor=colors.white,
        alignment=0,
    )

    table_data = [
        [
            Paragraph("Categoria", header_style),
            Paragraph("Chave", header_style),
            Paragraph("Substituída por", header_style),
            Paragraph("Exemplo do valor", header_style),
        ],
        [
            Paragraph("Arquivar", body_cell),
            Paragraph("{NUP}", mono_cell),
            Paragraph("Número da manifestação", body_cell),
            Paragraph("12345.678901/2025-11", body_cell),
        ],
        [
            Paragraph("Encaminhar", body_cell),
            Paragraph("{OUVIDORIA}", mono_cell),
            Paragraph("Nome da ouvidoria destino selecionada no combo", body_cell),
            Paragraph("Ouvidoria do Ministério X", body_cell),
        ],
        [
            Paragraph("Encaminhar", body_cell),
            Paragraph("{NUP}", mono_cell),
            Paragraph("Número da manifestação", body_cell),
            Paragraph("12345.678901/2025-11", body_cell),
        ],
        [
            Paragraph("Tramitar", body_cell),
            Paragraph("{PRAZO}", mono_cell),
            Paragraph(
                "Data de tratamento interno (campo de data da tela de tramitar)",
                body_cell,
            ),
            Paragraph("30/04/2026", body_cell),
        ],
        [
            Paragraph("Tramitar", body_cell),
            Paragraph("{SECRETARIA}", mono_cell),
            Paragraph(
                "Tag da secretaria responsável (campo txtTags da manifestação)",
                body_cell,
            ),
            Paragraph("SDA/DIPOA", body_cell),
        ],
    ]

    col_widths = [2.3 * cm, 3.4 * cm, 6.3 * cm, 5 * cm]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NEURON_PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 1), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
            ]
        )
    )
    story.append(table)

    story.append(Spacer(1, 10))

    story.append(Paragraph("Categorias sem Chaves", h_sub))
    story.append(
        Paragraph(
            "As categorias <b>Prorrogar</b>, <b>Tratar</b> e <b>Resposta</b> "
            "<b>não possuem</b> chaves de substituição no momento — o conteúdo do "
            "modelo é inserido no campo alvo exatamente como foi escrito, sem "
            "modificações. Evite incluir tokens do tipo <code>{...}</code> nessas "
            "categorias: eles serão enviados ao Fala.BR literalmente, sem substituição.",
            body,
        )
    )
    story.append(
        Paragraph(
            "Na página de opções, ao selecionar uma dessas categorias, um aviso cinza "
            "é exibido no lugar do painel de chips confirmando a ausência de chaves.",
            body,
        )
    )

    story.append(Paragraph("Retrocompatibilidade — Arquivar (NUP)", h_sub))
    story.append(
        Paragraph(
            "No módulo de <b>Arquivar</b>, a forma antiga <code>(NUP)</code> entre "
            "parênteses ainda é aceita como fallback para templates antigos que possam "
            "existir no armazenamento do usuário — os dois formatos coexistem. "
            "<b>Prefira <code>{NUP}</code></b> entre chaves em modelos novos: é o "
            "padrão canônico usado por todas as outras categorias e pelos chips da "
            "página de opções.",
            body,
        )
    )

    story.append(Paragraph("Como Usar na Página de Opções", h_sub))
    story.append(
        Paragraph(
            "1. Abra a página de opções e clique em <b>Modelos</b> na navegação "
            "lateral.<br/>"
            "2. Selecione uma categoria no seletor do topo.<br/>"
            "3. Observe o painel <b>\"Chaves disponíveis para esta categoria\"</b> "
            "logo acima do primeiro modelo — ele lista todas as chaves válidas como "
            "botões clicáveis.<br/>"
            "4. Clique em uma chave para copiá-la; uma confirmação aparece no rodapé "
            "do cartão.<br/>"
            "5. Cole a chave no <b>Conteúdo</b> do modelo, onde quiser que a "
            "substituição aconteça.<br/>"
            "6. Clique em <b>Salvar Modelos</b> (ou <b>Salvar Todas as Alterações</b>) "
            "para persistir.",
            body,
        )
    )

    story.append(
        Paragraph(
            "<b>DICA.</b> A lista de chaves é mantida centralizada em "
            "<code>shared/js/text-placeholders.js</code>. Se você desenvolve/adapta a "
            "extensão e adiciona uma nova substituição em um módulo, registre-a também "
            "nesse arquivo para que apareça nos chips.",
            callout,
        )
    )

    doc.build(story)
    return buf.getvalue()


def merge_pdfs(new_pages_bytes: bytes) -> None:
    original = PdfReader(str(PDF_PATH))
    new_pdf = PdfReader(io.BytesIO(new_pages_bytes))

    writer = PdfWriter()

    # Páginas 1..INSERT_AFTER_PAGE do original (0-indexadas: 0 .. INSERT_AFTER_PAGE-1)
    for i in range(INSERT_AFTER_PAGE):
        writer.add_page(original.pages[i])

    # Novas páginas geradas pelo reportlab
    for page in new_pdf.pages:
        writer.add_page(page)

    # Resto do PDF original
    for i in range(INSERT_AFTER_PAGE, len(original.pages)):
        writer.add_page(original.pages[i])

    # Copia metadados do original se houver
    if original.metadata:
        writer.add_metadata(
            {k: str(v) for k, v in original.metadata.items() if v is not None}
        )

    with open(PDF_PATH, "wb") as f:
        writer.write(f)

    print(
        f"OK. Total: {len(writer.pages)} páginas. "
        f"Inseridas {len(new_pdf.pages)} nova(s) página(s) após a página "
        f"{INSERT_AFTER_PAGE}."
    )


def main() -> int:
    if not PDF_PATH.exists():
        print(f"ERRO: {PDF_PATH} não encontrado", file=sys.stderr)
        return 1
    new_bytes = build_new_pages()
    merge_pdfs(new_bytes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
