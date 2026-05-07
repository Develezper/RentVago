import type { ParsedPropertySearchQuery } from "@/lib/property-search-query";
import type { PropertySearchResult } from "@/modules/properties/application/property.use-cases";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_X = 42;
const PAGE_MARGIN_BOTTOM = 36;
const HEADER_HEIGHT = 80;
const SUMMARY_HEIGHT = 74;
const PROPERTY_CARD_HEIGHT = 72;
const PROPERTY_CARD_GAP = 10;

interface SearchPdfInput {
  userLabel: string;
  filters: ParsedPropertySearchQuery;
  results: PropertySearchResult;
  generatedAt?: Date;
}

const toPdfSafeText = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
};

const clampText = (value: string, maxLength = 94): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
};

const toLocalDateText = (value: Date): string => {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
};

const toPriceText = (value: unknown): string => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(parsed);
};

const buildFilterSummary = (filters: ParsedPropertySearchQuery): string => {
  const items = [
    filters.query ? `Busqueda: ${filters.query}` : null,
    filters.location ? `Ubicacion: ${filters.location}` : null,
    filters.minPrice !== undefined ? `Precio min: ${toPriceText(filters.minPrice)}` : null,
    filters.maxPrice !== undefined ? `Precio max: ${toPriceText(filters.maxPrice)}` : null,
    filters.rooms !== undefined ? `Habitaciones: ${filters.rooms}+` : null,
    filters.verifiedOnly ? "Solo verificadas" : null,
  ].filter((item): item is string => item !== null);

  if (items.length === 0) return "Filtros: sin filtros adicionales";
  return `Filtros: ${items.join(" | ")}`;
};

const addBasePage = (
  pdf: PDFDocument,
  title: string,
  generatedAt: string,
  userLabel: string,
  filterSummary: string,
  summaryLine: string,
  regularFont: PDFFont,
  boldFont: PDFFont,
): { page: PDFPage; nextY: number } => {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
    color: rgb(0.05, 0.39, 0.33),
  });

  page.drawText(toPdfSafeText(title), {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 36,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(toPdfSafeText(`Generado: ${generatedAt}`), {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 56,
    size: 10,
    font: regularFont,
    color: rgb(0.88, 0.95, 0.93),
  });

  page.drawText(toPdfSafeText(`Usuario: ${userLabel}`), {
    x: PAGE_WIDTH - 210,
    y: PAGE_HEIGHT - 56,
    size: 10,
    font: regularFont,
    color: rgb(0.88, 0.95, 0.93),
  });

  const summaryY = PAGE_HEIGHT - HEADER_HEIGHT - 12 - SUMMARY_HEIGHT;

  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: summaryY,
    width: PAGE_WIDTH - PAGE_MARGIN_X * 2,
    height: SUMMARY_HEIGHT,
    borderWidth: 1,
    borderColor: rgb(0.83, 0.88, 0.87),
    color: rgb(0.97, 0.99, 0.99),
  });

  page.drawText(toPdfSafeText(clampText(summaryLine, 110)), {
    x: PAGE_MARGIN_X + 12,
    y: summaryY + 50,
    size: 10,
    font: boldFont,
    color: rgb(0.12, 0.2, 0.19),
  });

  page.drawText(toPdfSafeText(clampText(filterSummary, 110)), {
    x: PAGE_MARGIN_X + 12,
    y: summaryY + 30,
    size: 9,
    font: regularFont,
    color: rgb(0.28, 0.36, 0.35),
  });

  return { page, nextY: summaryY - 14 };
};

const drawPageFooter = (
  page: PDFPage,
  pageIndex: number,
  totalPages: number,
  regularFont: PDFFont,
) => {
  page.drawLine({
    start: { x: PAGE_MARGIN_X, y: 28 },
    end: { x: PAGE_WIDTH - PAGE_MARGIN_X, y: 28 },
    thickness: 0.8,
    color: rgb(0.86, 0.89, 0.88),
  });

  page.drawText(`Pagina ${pageIndex} de ${totalPages}`, {
    x: PAGE_WIDTH - PAGE_MARGIN_X - 78,
    y: 14,
    size: 9,
    font: regularFont,
    color: rgb(0.35, 0.43, 0.42),
  });
};

export const buildPropertySearchPdf = async ({
  userLabel,
  filters,
  results,
  generatedAt = new Date(),
}: SearchPdfInput): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [];
  const filterSummary = buildFilterSummary(filters);
  const summaryLine = `Resultados pagina ${results.meta.page} de ${results.meta.totalPages} | Total: ${results.meta.total} | Orden: ${filters.sort}`;

  const addPage = (): { page: PDFPage; nextY: number } => {
    const next = addBasePage(
      pdf,
      "RentVago | Reporte de busqueda",
      toLocalDateText(generatedAt),
      userLabel,
      filterSummary,
      summaryLine,
      regularFont,
      boldFont,
    );
    pages.push(next.page);
    return next;
  };

  let current = addPage();

  results.data.forEach((property, index) => {
    const needsNewPage = current.nextY - PROPERTY_CARD_HEIGHT < PAGE_MARGIN_BOTTOM;
    if (needsNewPage) current = addPage();

    const cardY = current.nextY - PROPERTY_CARD_HEIGHT;

    current.page.drawRectangle({
      x: PAGE_MARGIN_X,
      y: cardY,
      width: PAGE_WIDTH - PAGE_MARGIN_X * 2,
      height: PROPERTY_CARD_HEIGHT,
      borderWidth: 1,
      borderColor: rgb(0.86, 0.9, 0.9),
      color: index % 2 === 0 ? rgb(1, 1, 1) : rgb(0.985, 0.995, 0.995),
    });

    current.page.drawText(toPdfSafeText(`#${index + 1}`), {
      x: PAGE_MARGIN_X + 10,
      y: cardY + 48,
      size: 10,
      font: boldFont,
      color: rgb(0.05, 0.39, 0.33),
    });

    current.page.drawText(toPdfSafeText(clampText(property.title, 72)), {
      x: PAGE_MARGIN_X + 42,
      y: cardY + 49,
      size: 11,
      font: boldFont,
      color: rgb(0.13, 0.18, 0.17),
    });

    current.page.drawText(toPdfSafeText(clampText(property.location, 80)), {
      x: PAGE_MARGIN_X + 42,
      y: cardY + 31,
      size: 9,
      font: regularFont,
      color: rgb(0.31, 0.39, 0.38),
    });

    current.page.drawText(
      toPdfSafeText(
        `Precio: ${toPriceText(property.price)}   |   Habitaciones: ${property.rooms}`,
      ),
      {
        x: PAGE_MARGIN_X + 42,
        y: cardY + 15,
        size: 9,
        font: regularFont,
        color: rgb(0.28, 0.36, 0.35),
      },
    );

    current.nextY = cardY - PROPERTY_CARD_GAP;
  });

  if (results.data.length === 0) {
    current.page.drawRectangle({
      x: PAGE_MARGIN_X,
      y: current.nextY - 50,
      width: PAGE_WIDTH - PAGE_MARGIN_X * 2,
      height: 50,
      borderWidth: 1,
      borderColor: rgb(0.92, 0.85, 0.58),
      color: rgb(1, 0.99, 0.93),
    });

    current.page.drawText(
      "No se encontraron propiedades para los filtros seleccionados.",
      {
        x: PAGE_MARGIN_X + 12,
        y: current.nextY - 24,
        size: 10,
        font: regularFont,
        color: rgb(0.48, 0.35, 0.07),
      },
    );
  }

  pages.forEach((page, index) => {
    drawPageFooter(page, index + 1, pages.length, regularFont);
  });

  return pdf.save();
};
