import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Upload, Sparkles, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GalleryManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function GalleryManager({ images, onChange, maxImages = 6 }: GalleryManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast({
        variant: "destructive",
        title: "Maximum images reached",
        description: `You can upload a maximum of ${maxImages} images.`,
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadedPaths: string[] = [];

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/university/upload-gallery-image', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        uploadedPaths.push(data.imagePath);
      }

      onChange([...images, ...uploadedPaths]);
      toast({
        title: "Images uploaded",
        description: `${uploadedPaths.length} image(s) uploaded successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt required",
        description: "Please enter a description for the image you want to generate.",
      });
      return;
    }

    if (images.length >= maxImages) {
      toast({
        variant: "destructive",
        title: "Maximum images reached",
        description: `You can have a maximum of ${maxImages} images.`,
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await apiRequest("POST", "/api/university/generate-gallery-image", {
        prompt: aiPrompt,
      }) as any as { imagePath: string };

      onChange([...images, response.imagePath]);
      toast({
        title: "Image generated",
        description: "AI-generated image added to your gallery.",
      });
      setShowAIDialog(false);
      setAiPrompt("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message || "Failed to generate image. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
    toast({
      title: "Image removed",
      description: "Image removed from gallery.",
    });
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || images.length >= maxImages}
          data-testid="button-upload-gallery-image"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAIDialog(true)}
          disabled={isGenerating || images.length >= maxImages}
          data-testid="button-generate-gallery-ai"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
          data-testid="input-gallery-upload"
        />
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {images.map((image, index) => (
            <Card key={index} className="relative aspect-[3/2] overflow-hidden group">
              <img
                src={image}
                alt={`Gallery image ${index + 1}`}
                className="w-full h-full object-cover"
                data-testid={`img-gallery-${index}`}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveImage(index)}
                data-testid={`button-remove-gallery-${index}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            No gallery images yet. Upload images or generate them with AI.
          </p>
        </div>
      )}

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent data-testid="dialog-ai-generate">
          <DialogHeader>
            <DialogTitle>Generate Image with AI</DialogTitle>
            <DialogDescription>
              Describe the image you want to generate for your institution gallery.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Image Description</label>
              <Input
                placeholder="e.g., Modern university campus with students studying outdoors"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    handleGenerateAI();
                  }
                }}
                data-testid="input-ai-prompt"
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what you want to see in the image.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAIDialog(false);
                setAiPrompt("");
              }}
              disabled={isGenerating}
              data-testid="button-cancel-ai"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGenerating || !aiPrompt.trim()}
              data-testid="button-confirm-ai"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { ImageIcon } from "lucide-react";
