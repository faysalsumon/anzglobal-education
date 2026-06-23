import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
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

// Vite resolves this to the bundled worker file at the same origin.
// Using new URL(..., import.meta.url) avoids any blob: worker issues.
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
  // Shared fetch state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF state — pass ArrayBuffer directly so the pdfjs worker never re-fetches
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);

  // Image state — blob URL is fine for <img> (same-thread access)
  const [imgBlobUrl, setImgBlobUrl] = useState<string | null>(null);
  const [imgZoom, setImgZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Download-only blob URL created on demand from the stored ArrayBuffer / blob
  const downloadBlobRef = useRef<{ url: string; revoke: () => void } | null>(null);

  const { toast } = useToast();

  const isImage =
    mimeType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(documentName);
  const isPdf =
    mimeType === "application/pdf" || /\.pdf$/i.test(documentName);

  const fetchDocument = useCallback(async () => {
    if (!documentUrl || !open) return;

    setLoading(true);
    setError(null);
    setPdfData(null);
    setImgBlobUrl(null);
    setNumPages(null);
    setCurrentPage(1);

    // Clean up any previous download blob
    if (downloadBlobRef.current) {
      downloadBlobRef.current.revoke();
      downloadBlobRef.current = null;
    }

    try {
      if (!supabase) throw new Error("Authentication not available");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Please log in to view documents");

      const response = await fetch(documentUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch document");

      if (isPdf) {
        // Pass raw bytes to pdfjs — no worker re-fetch needed
        const buffer = await response.arrayBuffer();
        setPdfData(buffer);
      } else if (isImage) {
        const blob = await response.blob();
        setImgBlobUrl(URL.createObjectURL(blob));
      } else {
        // For unknown types just store for download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        downloadBlobRef.current = { url, revoke: () => URL.revokeObjectURL(url) };
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load document";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
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

  // Cleanup on unmount / close
  useEffect(() => {
    return () => {
      if (imgBlobUrl) URL.revokeObjectURL(imgBlobUrl);
      if (downloadBlobRef.current) downloadBlobRef.current.revoke();
    };
  }, [imgBlobUrl]);

  const handleDownload = useCallback(() => {
    let url: string | null = null;
    let revoke = false;

    if (pdfData) {
      // Create a one-off blob URL for download
      const blob = new Blob([pdfData], { type: "application/pdf" });
      url = URL.createObjectURL(blob);
      revoke = true;
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

    if (revoke) setTimeout(() => URL.revokeObjectURL(url!), 1000);
  }, [pdfData, imgBlobUrl, documentName]);

  const handlePdfZoomIn = () =>
    setPdfScale((prev) => Math.min(+(prev + 0.2).toFixed(1), 3.0));
  const handlePdfZoomOut = () =>
    setPdfScale((prev) => Math.max(+(prev - 0.2).toFixed(1), 0.4));

  const handleImgZoomIn = () => setImgZoom((prev) => Math.min(prev + 25, 200));
  const handleImgZoomOut = () => setImgZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const hasContent = !!(pdfData || imgBlobUrl || downloadBlobRef.current);

  const getFileIcon = (size = "h-5 w-5") => {
    if (isImage)
      return <ImageIcon className={`${size} text-muted-foreground shrink-0`} />;
    if (isPdf)
      return <FileText className={`${size} text-muted-foreground shrink-0`} />;
    return <File className={`${size} text-muted-foreground shrink-0`} />;
  };

  const pdfZoomPercent = Math.round(pdfScale * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] max-h-[92vh] w-full h-full flex flex-col p-0 gap-0">
        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <DialogHeader className="flex flex-row items-center justify-between gap-2 px-4 py-2.5 border-b shrink-0 flex-wrap">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium min-w-0 flex-1">
            {getFileIcon()}
            <span className="truncate">{documentName}</span>
          </DialogTitle>

          <div className="flex items-center gap-1 flex-wrap">
            {/* Page navigation — PDF only */}
            {isPdf && pdfData && numPages && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  data-testid="button-pdf-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-16 text-center tabular-nums">
                  {currentPage} / {numPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, numPages))
                  }
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePdfZoomOut}
                  disabled={pdfScale <= 0.4}
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
                  {pdfZoomPercent}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePdfZoomIn}
                  disabled={pdfScale >= 3.0}
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}

            {/* Zoom + rotate — images */}
            {isImage && imgBlobUrl && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleImgZoomOut}
                  disabled={imgZoom <= 50}
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
                  {imgZoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleImgZoomIn}
                  disabled={imgZoom >= 200}
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRotate}
                  data-testid="button-rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={!hasContent}
              data-testid="button-download-document"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* ── Document area ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4">
          {loading && (
            <div className="flex flex-col items-center gap-3 mt-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 mt-16 text-center">
              {getFileIcon("h-12 w-12")}
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchDocument}>
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* PDF — bytes passed directly; no worker re-fetch */}
              {isPdf && pdfData && (
                <Document
                  file={{ data: pdfData }}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(err) =>
                    setError(err.message || "Failed to render PDF")
                  }
                  loading={
                    <div className="flex flex-col items-center gap-3 mt-16">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Rendering PDF…
                      </p>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center gap-3 mt-16 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-destructive">
                        Failed to render PDF
                      </p>
                      <Button variant="outline" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-2" />
                        Download instead
                      </Button>
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    scale={pdfScale}
                    renderTextLayer
                    renderAnnotationLayer
                    className="shadow-md"
                  />
                </Document>
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

              {/* Unknown file type */}
              {!isPdf && !isImage && hasContent && (
                <div className="flex flex-col items-center gap-4 mt-16 text-center">
                  {getFileIcon("h-12 w-12")}
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type
                  </p>
                  <Button
                    onClick={handleDownload}
                    data-testid="button-download-unsupported"
                  >
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
