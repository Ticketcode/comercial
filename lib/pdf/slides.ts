import type { jsPDF } from "jspdf";
import type html2canvasFn from "html2canvas";

// Tamaño "Widescreen" estándar de presentación (16:9) en mm — equivalente a
// 1920x1080px, el lienzo en el que están maquetadas las láminas.
const SLIDE_WIDTH_MM = 338.67;
const SLIDE_HEIGHT_MM = 190.5;

/**
 * Captura cada lámina (ya maquetada a 1920x1080, sin desbordar) y la agrega
 * como una página completa del PDF, sin márgenes ni recortes — a diferencia
 * del contenido que fluye libremente (Viáticos, Legalización), aquí cada
 * lámina siempre ocupa exactamente una página.
 */
export async function renderSlidesToPdf(
  pdf: jsPDF,
  slideEls: ArrayLike<HTMLElement>,
  html2canvas: typeof html2canvasFn
) {
  const pxToMm = SLIDE_WIDTH_MM / 1920;
  let isFirstPage = true;
  for (const el of Array.from(slideEls)) {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, windowWidth: 1920 });
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    if (!isFirstPage) pdf.addPage([SLIDE_WIDTH_MM, SLIDE_HEIGHT_MM], "landscape");
    pdf.addImage(imgData, "JPEG", 0, 0, SLIDE_WIDTH_MM, SLIDE_HEIGHT_MM);

    // Elementos marcados con data-pdf-link (ej. las fotos de "Casos de
    // éxito", que son fotogramas de videos de YouTube) quedan clickeables
    // en el PDF exportado, apuntando a su URL real.
    const elRect = el.getBoundingClientRect();
    const linkEls = el.querySelectorAll<HTMLElement>("[data-pdf-link]");
    for (const linkEl of Array.from(linkEls)) {
      const url = linkEl.getAttribute("data-pdf-link");
      if (!url) continue;
      const r = linkEl.getBoundingClientRect();
      pdf.link(
        (r.left - elRect.left) * pxToMm,
        (r.top - elRect.top) * pxToMm,
        r.width * pxToMm,
        r.height * pxToMm,
        { url }
      );
    }

    isFirstPage = false;
  }
}

export const SLIDE_PDF_FORMAT: [number, number] = [SLIDE_WIDTH_MM, SLIDE_HEIGHT_MM];
