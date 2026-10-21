import type { jsPDF } from "jspdf";
import type html2canvasFn from "html2canvas";

const MARGIN_MM = 8;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const USABLE_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const USABLE_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_MM * 2;

/**
 * Y relativos (en px DOM, respecto al borde superior de `el`) donde SÍ se
 * puede cortar una página sin partir una fila de tabla por la mitad: el
 * borde inferior de cada `<tr>` (o de cualquier elemento marcado con
 * `data-pdf-atomic`), más el final del contenido.
 */
function collectSafeCutPoints(el: HTMLElement): number[] {
  const containerTop = el.getBoundingClientRect().top;
  const atoms = el.querySelectorAll<HTMLElement>("tr, [data-pdf-atomic]");
  const points = new Set<number>([el.scrollHeight]);
  atoms.forEach((atom) => {
    points.add(atom.getBoundingClientRect().bottom - containerTop);
  });
  return Array.from(points).sort((a, b) => a - b);
}

/**
 * Captura cada elemento con html2canvas y lo agrega al PDF. Cuando el
 * contenido de un elemento es más alto que una hoja A4, se corta en varias
 * páginas (en vez de desbordar la hoja y perder lo que no cabe, como pasaba
 * con el "pagebreak" automático de html2pdf.js). El corte se ajusta al
 * borde inferior de la fila de tabla más cercana que quepa en la página,
 * para no partir una fila (p. ej. "Depositar a cuenta N°") entre dos hojas.
 */
export async function addElementsAsPdfPages(
  pdf: jsPDF,
  pageEls: ArrayLike<HTMLElement>,
  html2canvas: typeof html2canvasFn
) {
  let isFirstPage = true;

  for (const el of Array.from(pageEls)) {
    const safeCutPointsDom = collectSafeCutPoints(el);
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, windowWidth: 700 });
    const pxPerMm = canvas.width / USABLE_WIDTH_MM;
    const usableHeightPx = Math.floor(USABLE_HEIGHT_MM * pxPerMm);
    const domToCanvasRatio = canvas.height / el.scrollHeight;
    const safeCutPoints = safeCutPointsDom.map((y) => Math.round(y * domToCanvasRatio));

    let offsetY = 0;
    while (offsetY < canvas.height) {
      const maxSliceEnd = Math.min(offsetY + usableHeightPx, canvas.height);
      const safeEnd = [...safeCutPoints].reverse().find((p) => p > offsetY && p <= maxSliceEnd);
      const sliceEnd = safeEnd ?? maxSliceEnd;
      const sliceHeightPx = sliceEnd - offsetY;

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
