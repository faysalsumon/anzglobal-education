import { useState, useEffect, useCallback, useRef } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  X,
  FileText,
  ImageIcon,
  File,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Worker served from same origin via Vite's URL-import bundling
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  documentName: string;
  mimeType?: string;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  documentUrl,
  documentName,
  mimeType,
}: DocumentPreviewModalProps) {
  // ── Fetch state ────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pdfData holds the ORIGINAL ArrayBuffer — never passed directly to pdfjs
  // (pdfjs.getDocument receives pdfData.slice(0) so the state stays intact)
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);

  // Image state
  const [imgBlobUrl, setImgBlobUrl] = useState<string | null>(null);
  const [imgZoom, setImgZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Unknown types — download-only
  const downloadBlobRef = useRef<{ url: string; revoke: () => void } | null>(null);

  // ── PDF render state ───────────────────────────────────────────
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [pdfRendering, setPdfRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);

  const { toast } = useToast();

  const isImage =
    mimeType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(documentName);
  const isPdf =
    mimeType === "application/pdf" || /\.pdf$/i.test(documentName);

  // ── 1. Fetch document bytes ────────────────────────────────────
  const fetchDocument = useCallback(async () => {
    if (!documentUrl || !open) return;

    setLoading(true);
    setError(null);
    setPdfData(null);
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);
    setImgBlobUrl(null);

    if (downloadBlobRef.current) {
      downloadBlobRef.current.revoke();
      downloadBlobRef.current = null;
    }

    try {
      if (!supabase) throw new Error("Authentication not available");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Please log in to view documents");

      const response = await fetch(documentUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch document");

      if (isPdf) {
        const buffer = await response.arrayBuffer();
        setPdfData(buffer);
      } else if (isImage) {
        const blob = await response.blob();
        setImgBlobUrl(URL.createObjectURL(blob));
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        downloadBlobRef.current = { url, revoke: () => URL.revokeObjectURL(url) };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load document";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [documentUrl, open, toast, isPdf, isImage]);

  useEffect(() => {
    if (open) {
      fetchDocument();
      setImgZoom(100);
      setRotation(0);
      setPdfScale(1.2);
    }
  }, [open, fetchDocument]);

  // Cleanup blobs on unmount / modal close
  useEffect(() => {
    return () => {
      if (imgBlobUrl) URL.revokeObjectURL(imgBlobUrl);
      if (downloadBlobRef.current) downloadBlobRef.current.revoke();
    };
  }, [imgBlobUrl]);

  // ── 2. Load PDF document from bytes (slice = fresh copy for pdfjs) ──
  useEffect(() => {
    if (!pdfData || !isPdf) return;

    let loadingTask: pdfjs.PDFDocumentLoadingTask | null = null;
    let cancelled = false;

    (async () => {
      try {
        // slice(0) creates a fresh copy — pdfjs may transfer/detach it,
        // but pdfData in state remains intact for subsequent downloads.
        loadingTask = pdfjs.getDocument({ data: pdfData.slice(0) });
        const doc = await loadingTask.promise;
        if (cancelled) { doc.destroy(); return; }
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load PDF";
          setError(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [pdfData, isPdf]);

  // ── 3. Render current page onto canvas ─────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    // Cancel any in-flight render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    (async () => {
      try {
        setPdfRendering(true);
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: pdfScale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (err: unknown) {
        // RenderingCancelledException is expected on rapid navigation
        if (!cancelled && (err as Error)?.name !== "RenderingCancelledException") {
          setError((err as Error)?.message ?? "Failed to render page");
        }
      } finally {
        if (!cancelled) setPdfRendering(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, pdfScale]);

  // ── Download ───────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    let url: string | null = null;
    let shouldRevoke = false;

    if (pdfData) {
      const blob = new Blob([pdfData], { type: "application/pdf" });
      url = URL.createObjectURL(blob);
      shouldRevoke = true;
    } else if (imgBlobUrl) {
      url = imgBlobUrl;
    } else if (downloadBlobRef.current) {
      url = downloadBlobRef.current.url;
    }

    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = documentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (shouldRevoke) setTimeout(() => URL.revokeObjectURL(url!), 1000);
  }, [pdfData, imgBlobUrl, documentName]);

  // ── Zoom helpers ───────────────────────────────────────────────
  const pdfZoomIn  = () => setPdfScale((p) => Math.min(+(p + 0.2).toFixed(1), 3.0));
  const pdfZoomOut = () => setPdfScale((p) => Math.max(+(p - 0.2).toFixed(1), 0.4));
  const imgZoomIn  = () => setImgZoom((p) => Math.min(p + 25, 200));
  const imgZoomOut = () => setImgZoom((p) => Math.max(p - 25, 50));
  const rotate     = () => setRotation((p) => (p + 90) % 360);

  const hasContent = !!(pdfData || imgBlobUrl || downloadBlobRef.current);
  const pdfZoomPct = Math.round(pdfScale * 100);

  const fileIcon = (size = "h-5 w-5") => {
    if (isImage) return <ImageIcon className={`${size} text-muted-foreground shrink-0`} />;
    if (isPdf)   return <FileText  className={`${size} text-muted-foreground shrink-0`} />;
    return              <File      className={`${size} text-muted-foreground shrink-0`} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] max-h-[92vh] w-full h-full flex flex-col p-0 gap-0 [&>button:last-child]:hidden">

        {/* ── Toolbar ──────────────────────────────────────────────── */}
        <DialogHeader className="flex flex-row items-center justify-between gap-2 px-4 py-2.5 border-b shrink-0 flex-wrap">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium min-w-0 flex-1">
            {fileIcon()}
            <span className="truncate">{documentName}</span>
          </DialogTitle>

          <div className="flex items-center gap-1 flex-wrap">
            {/* Page navigation — PDF */}
            {isPdf && pdfDoc && numPages > 0 && (
              <>
                <Button variant="ghost" size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  data-testid="button-pdf-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-16 text-center tabular-nums">
                  {currentPage} / {numPages}
                </span>
                <Button variant="ghost" size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, numPages))}
                  disabled={currentPage >= numPages}
                  data-testid="button-pdf-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}

            {/* Zoom — PDF */}
            {isPdf && pdfData && (
              <>
                <Button variant="ghost" size="icon" onClick={pdfZoomOut}
                  disabled={pdfScale <= 0.4} data-testid="button-zoom-out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
                  {pdfZoomPct}%
                </span>
                <Button variant="ghost" size="icon" onClick={pdfZoomIn}
                  disabled={pdfScale >= 3.0} data-testid="button-zoom-in">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}

            {/* Zoom + rotate — images */}
            {isImage && imgBlobUrl && (
              <>
                <Button variant="ghost" size="icon" onClick={imgZoomOut}
                  disabled={imgZoom <= 50} data-testid="button-zoom-out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
                  {imgZoom}%
                </span>
                <Button variant="ghost" size="icon" onClick={imgZoomIn}
                  disabled={imgZoom >= 200} data-testid="button-zoom-in">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={rotate}
                  data-testid="button-rotate">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}

            <Button variant="ghost" size="icon" onClick={handleDownload}
              disabled={!hasContent} data-testid="button-download-document">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}
              data-testid="button-close-preview">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* ── Document area ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 mt-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 mt-16 text-center">
              {fileIcon("h-12 w-12")}
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchDocument}>Try Again</Button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* PDF — canvas rendered via pdfjs-dist directly */}
              {isPdf && (
                <div className="relative flex items-start justify-center">
                  {pdfRendering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {pdfDoc ? (
                    <canvas ref={canvasRef} className="shadow-md max-w-full" />
                  ) : pdfData ? (
                    <div className="flex flex-col items-center gap-3 mt-16">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Parsing PDF…</p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Image */}
              {isImage && imgBlobUrl && (
                <img
                  src={imgBlobUrl}
                  alt={documentName}
                  className="max-w-full object-contain transition-transform duration-200 shadow-md"
                  style={{
                    transform: `scale(${imgZoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: "top center",
                  }}
                />
              )}

              {/* Unknown type */}
              {!isPdf && !isImage && hasContent && (
                <div className="flex flex-col items-center gap-4 mt-16 text-center">
                  {fileIcon("h-12 w-12")}
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type
                  </p>
                  <Button onClick={handleDownload} data-testid="button-download-unsupported">
                    <Download className="h-4 w-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
