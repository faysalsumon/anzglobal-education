import { useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const COMPRESSIBLE_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_DIMENSION = 3000;
const IMAGE_QUALITY = 0.8;
const PDF_DPI = 150;
const PDF_BASE_DPI = 72;
const PDF_SCALE = PDF_DPI / PDF_BASE_DPI;

export interface CompressionResult {
  file: File;
  originalMB: number;
  compressedMB: number;
  wasCompressed: boolean;
}

function passthroughResult(file: File): CompressionResult {
  const mb = file.size / (1024 * 1024);
  return { file, originalMB: mb, compressedMB: mb, wasCompressed: false };
}

async function compressImage(file: File): Promise<CompressionResult> {
  const originalMB = file.size / (1024 * 1024);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context unavailable")); return; }

      ctx.drawImage(img, 0, 0, width, height);

      const outType = "image/jpeg";
      const outName = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, ".jpg");

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Canvas toBlob returned null")); return; }
          const compressed = new File([blob], outName, { type: outType });
          const compressedMB = compressed.size / (1024 * 1024);
          if (compressedMB >= originalMB * 0.95) {
            resolve(passthroughResult(file));
          } else {
            resolve({ file: compressed, originalMB, compressedMB, wasCompressed: true });
          }
        },
        outType,
        IMAGE_QUALITY,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

async function compressPdf(file: File): Promise<CompressionResult> {
  const originalMB = file.size / (1024 * 1024);
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const outPdf = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: PDF_SCALE });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const jpegDataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
    const base64 = jpegDataUrl.split(",")[1];
    const jpegBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const jpegImage = await outPdf.embedJpg(jpegBytes);
    const pdfPage = outPdf.addPage([viewport.width, viewport.height]);
    pdfPage.drawImage(jpegImage, { x: 0, y: 0, width: viewport.width, height: viewport.height });
  }

  pdfDoc.destroy();

  const outBytes = await outPdf.save();
  const blob = new Blob([outBytes], { type: "application/pdf" });
  const compressed = new File([blob], file.name, { type: "application/pdf" });
  const compressedMB = compressed.size / (1024 * 1024);

  if (compressedMB >= originalMB * 0.95) {
    return passthroughResult(file);
  }

  return { file: compressed, originalMB, compressedMB, wasCompressed: true };
}

export function useFileCompressor(thresholdMB = 8) {
  const [compressing, setCompressing] = useState(false);

  const compress = useCallback(
    async (file: File): Promise<CompressionResult> => {
      const sizeMB = file.size / (1024 * 1024);
      const isImage = COMPRESSIBLE_IMAGE_TYPES.includes(file.type);
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (sizeMB <= thresholdMB || (!isImage && !isPdf)) {
        return passthroughResult(file);
      }

      setCompressing(true);
      try {
        if (isImage) return await compressImage(file);
        return await compressPdf(file);
      } catch {
        return passthroughResult(file);
      } finally {
        setCompressing(false);
      }
    },
    [thresholdMB],
  );

  return { compress, compressing };
}
