import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";

interface CourseThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  aspectRatio?: "video" | "square" | "wide";
  testId?: string;
  status?: string | null;
  priority?: boolean;
}

export function CourseThumbnail({
  src,
  alt,
  className = "",
  aspectRatio = "video",
  testId,
  status,
  priority = false,
}: CourseThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[21/9]",
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const showPlaceholder = !src || hasError || status === "generating";
  const showSkeleton = status === "generating" || (!isLoaded && !showPlaceholder);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-t-md bg-muted ${aspectClasses[aspectRatio]} ${className}`}
      data-testid={testId}
    >
      {showSkeleton && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {showPlaceholder && !showSkeleton && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto opacity-50" />
            <span className="text-xs mt-1 block opacity-50">No thumbnail</span>
          </div>
        </div>
      )}

      {!showPlaceholder && isInView && src && (
        <img
          src={src}
          alt={alt}
          width={400}
          height={225}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      )}
    </div>
  );
}
