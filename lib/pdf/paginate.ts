import type { jsPDF } from "jspdf";
import type html2canvasFn from "html2canvas";

const MARGIN_MM = 8;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const USABLE_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const USABLE_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_MM * 2;

/**
 * Captura cada elemento con html2canvas y lo agrega al PDF. Cuando el
 * contenido de un elemento es más alto que una hoja A4, se corta en varias
 * páginas de alto uniforme (en vez de desbordar la hoja y perder lo que no
 * cabe), en lugar del "pagebreak" automático de html2pdf.js que dejaba
 * huecos en blanco.
 */
export async function addElementsAsPdfPages(
  pdf: jsPDF,
  pageEls: ArrayLike<HTMLElement>,
  html2canvas: typeof html2canvasFn
) {
  let isFirstPage = true;

  for (const el of Array.from(pageEls)) {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, windowWidth: 700 });
    const pxPerMm = canvas.width / USABLE_WIDTH_MM;
    const usableHeightPx = Math.floor(USABLE_HEIGHT_MM * pxPerMm);

    let offsetY = 0;
    while (offsetY < canvas.height) {
      const sliceHeightPx = Math.min(usableHeightPx, canvas.height - offsetY);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

      const imgData = sliceCanvas.toDataURL("image/jpeg", 0.98);
      const imgHeightMm = sliceHeightPx / pxPerMm;
      if (!isFirstPage) pdf.addPage();
      pdf.addImage(imgData, "JPEG", MARGIN_MM, MARGIN_MM, USABLE_WIDTH_MM, imgHeightMm);
      isFirstPage = false;
      offsetY += sliceHeightPx;
    }
  }
}
