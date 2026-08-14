import { formatCurrency, formatDate } from "@/features/clients/utils/formatters";
import type { QuoteDetailData } from "../types";
import { getQuoteStatusLabel } from "../utils/quote-labels";

function normalizeForPdf(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapePdfText(value: string): string {
  return normalizeForPdf(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function buildPdfContent(lines: readonly string[]): string {
  const commands = [
    "BT",
    "/F1 11 Tf",
    "72 770 Td",
  ];

  lines.forEach((line, index) => {
    commands.push(`(${escapePdfText(line)}) Tj`);
    if (index < lines.length - 1) {
      commands.push("0 -14 Td");
    }
  });
  commands.push("ET");

  return commands.join("\n");
}

function buildPdfDocument(pages: readonly (readonly string[])[]): Uint8Array {
  const objects: string[] = [];
  const addObject = (body: string): number => {
    objects.push(body);
    return objects.length;
  };

  const contentIds = pages.map(() => addObject(""));
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = pages.map(() => addObject(""));
  const pagesId = addObject("");
  const catalogId = addObject("");

  pages.forEach((lines, index) => {
    const content = buildPdfContent(lines);
    const contentObjectId = contentIds[index]!;
    objects[contentObjectId - 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;

    const pageObjectId = pageIds[index]!;
    objects[pageObjectId - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  const header = "%PDF-1.4\n";
  const chunks: string[] = [header];
  const offsets: number[] = [0];
  let position = header.length;

  objects.forEach((body, index) => {
    const objectNumber = index + 1;
    const objectString = `${objectNumber} 0 obj\n${body}\nendobj\n`;
    offsets.push(position);
    chunks.push(objectString);
    position += objectString.length;
  });

  const xrefStart = position;
  const xrefEntries = offsets
    .map((offset, index) => (index === 0 ? "0000000000 65535 f " : `${String(offset).padStart(10, "0")} 00000 n `))
    .join("\n");
  const trailer = `xref\n0 ${objects.length + 1}\n${xrefEntries}\ntrailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  chunks.push(trailer);

  return new TextEncoder().encode(chunks.join(""));
}

function splitIntoPages(lines: readonly string[], maxLinesPerPage = 26): readonly (readonly string[])[] {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }
  return pages;
}

export function buildQuotePdfFileName(quoteNumber: string): string {
  return `cotizacion-${quoteNumber}.pdf`;
}

export function buildQuotePdfLines(detail: QuoteDetailData): readonly string[] {
  const lines: string[] = [
    `Cotizacion ${detail.quote.number}`,
    `Cliente: ${detail.clientName}`,
    `Vendedor: ${detail.sellerName ?? "Sin asignar"}`,
    `Fecha: ${formatDate(detail.quote.createdAt)}`,
    `Vigencia: ${formatDate(detail.quote.validUntil)}`,
    `Estado: ${getQuoteStatusLabel(detail.quote.status)}`,
    `Condiciones comerciales: ${detail.quote.commercialConditions ?? "Sin condiciones comerciales"}`,
    `Observaciones: ${detail.quote.notes ?? "Sin observaciones"}`,
    "",
    "Productos",
  ];

  detail.quote.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.description}`,
      `   Cantidad: ${item.quantity}`,
      `   Precio unitario: ${formatCurrency(item.unitPrice)}`,
      `   Descuento: ${item.discountPercentage}%`,
      `   Subtotal: ${formatCurrency(item.quantity * item.unitPrice)}`,
      `   Total: ${formatCurrency(item.lineTotal)}`,
      "",
    );
  });

  lines.push(
    `Subtotal: ${formatCurrency(detail.totals.subtotal)}`,
    `Descuento general: ${formatCurrency(detail.totals.discountTotal)}`,
    `Total: ${formatCurrency(detail.totals.total)}`,
    `Unidades: ${detail.totals.unitsCount}`,
  );

  return lines;
}

export function downloadQuotePdf(detail: QuoteDetailData): void {
  const lines = buildQuotePdfLines(detail);
  const pages = splitIntoPages(lines);
  const pdfBytes = buildPdfDocument(pages);
  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const objectUrl = globalThis.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = buildQuotePdfFileName(detail.quote.number);
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => {
    globalThis.URL.revokeObjectURL(objectUrl);
  }, 1000);
}
