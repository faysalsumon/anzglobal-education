import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WebcamCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "clock-in" | "clock-out";
  onCapture: (blob: Blob) => void;
  isSubmitting: boolean;
}

export function WebcamCaptureModal({
  open,
  onOpenChange,
  mode,
  onCapture,
  isSubmitting,
}: WebcamCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [captured, setCaptured] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Your browser does not support camera access. Please use a modern browser (Chrome, Safari, Firefox) over HTTPS.");
      return;
    }

    const attemptGetStream = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      return navigator.mediaDevices.getUserMedia(constraints);
    };

    let stream: MediaStream | null = null;
    try {
      // First attempt: preferred front-facing camera with ideal (not exact) dimensions
      stream = await attemptGetStream({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings and try again.");
        return;
      }
      // Second attempt: bare video with no constraints (widest device compatibility)
      try {
        stream = await attemptGetStream({ video: true });
      } catch (err2: any) {
        if (err2?.name === "NotAllowedError" || err2?.name === "PermissionDeniedError") {
          setCameraError("Camera permission denied. Please allow camera access in your browser settings and try again.");
        } else if (err2?.name === "NotFoundError" || err2?.name === "DevicesNotFoundError") {
          setCameraError("No camera found on this device. Please connect a camera and try again.");
        } else if (err2?.name === "NotReadableError" || err2?.name === "TrackStartError") {
          setCameraError("Camera is in use by another application. Please close other apps using the camera and try again.");
        } else {
          setCameraError("Camera not available. Please allow camera access in your browser settings and try again.");
        }
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        const markReady = () => setCameraReady(true);
        video.addEventListener("loadedmetadata", markReady, { once: true });
        video.addEventListener("canplay", markReady, { once: true });
        video.play().catch(() => {
          // play() may be blocked — camera still usable for capture
          setCameraReady(true);
        });
      }
    }
  };

  useEffect(() => {
    if (open) {
      setCaptured(false);
      setCapturedDataUrl(null);
      startCamera();
    } else {
      stopCamera();
      setCaptured(false);
      setCapturedDataUrl(null);
      setCameraError(null);
    }
    return () => stopCamera();
  }, [open]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = 640;
    canvasRef.current.height = 480;
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.85);
    setCapturedDataUrl(dataUrl);
    setCaptured(true);
    stopCamera();
  };

  const handleRetake = () => {
    setCaptured(false);
    setCapturedDataUrl(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.85
    );
  };

  const title = mode === "clock-in" ? "Work Login" : "Work Logout";
  const subtitle =
    mode === "clock-in"
      ? "Take a photo to clock in for the day"
      : "Take a photo to clock out and record your time";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        aria-describedby={undefined}
        data-testid="dialog-webcam-capture"
      >
        <DialogHeader>
          <DialogTitle data-testid="text-webcam-title">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {cameraError ? (
            <div
              className="flex flex-col items-center gap-3 py-8 text-center"
              data-testid="status-camera-error"
            >
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">{cameraError}</p>
              <Button type="button" variant="outline" onClick={startCamera}>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-muted">
                {!captured && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    data-testid="video-camera-feed"
                    style={{ display: captured ? "none" : "block" }}
                  />
                )}
                {captured && capturedDataUrl && (
                  <img
                    src={capturedDataUrl}
                    alt="Captured photo"
                    className="w-full h-full object-cover"
                    data-testid="img-captured-photo"
                  />
                )}
                {!cameraReady && !captured && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!captured && cameraReady && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-3 w-full">
                {!captured ? (
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleCapture}
                    disabled={!cameraReady}
                    data-testid="button-capture-photo"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleRetake}
                      disabled={isSubmitting}
                      data-testid="button-retake-photo"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retake
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={handleConfirm}
                      disabled={isSubmitting}
                      data-testid="button-confirm-capture"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {isSubmitting ? "Saving..." : "Confirm"}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
