import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, FileText, Image, File, Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const { toast } = useToast();

  const isImage = mimeType?.startsWith("image/") || 
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(documentName);
  const isPdf = mimeType === "application/pdf" || 
    /\.pdf$/i.test(documentName);

  const fetchDocument = useCallback(async () => {
    if (!documentUrl || !open) return;
    
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    try {
      if (!supabase) {
        throw new Error("Authentication not available");
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Please log in to view documents");
      }

      const response = await fetch(documentUrl, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load document";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [documentUrl, open, toast]);

  useEffect(() => {
    if (open) {
      fetchDocument();
      setZoom(100);
      setRotation(0);
    }
  }, [open, fetchDocument]);
  
  // Cleanup blob URL when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleDownload = useCallback(async () => {
    if (!blobUrl) return;
    
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = documentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [blobUrl, documentName]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const getFileIcon = () => {
    if (isImage) return <Image className="h-16 w-16 text-muted-foreground" />;
    if (isPdf) return <FileText className="h-16 w-16 text-muted-foreground" />;
    return <File className="h-16 w-16 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full flex flex-col p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium truncate">
            {getFileIcon()}
            <span className="truncate">{documentName}</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            {(isImage || isPdf) && blobUrl && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-12 text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                {isImage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRotate}
                    data-testid="button-rotate"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={!blobUrl}
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

        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 text-center">
              {getFileIcon()}
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchDocument}>
                Try Again
              </Button>
            </div>
          )}

          {blobUrl && !loading && !error && (
            <>
              {isPdf && (
                <object
                  data={blobUrl}
                  type="application/pdf"
                  className="w-full h-full"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "top center",
                  }}
                >
                  <div className="flex flex-col items-center gap-4 text-center p-8">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      PDF preview is not available in your browser
                    </p>
                    <Button onClick={handleDownload} data-testid="button-download-pdf-fallback">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </object>
              )}

              {isImage && (
                <img
                  src={blobUrl}
                  alt={documentName}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  }}
                />
              )}

              {!isPdf && !isImage && (
                <div className="flex flex-col items-center gap-4 text-center">
                  {getFileIcon()}
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
