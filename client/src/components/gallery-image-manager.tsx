import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Sparkles, Link as LinkIcon, X, Loader2, Image as ImageIcon } from "lucide-react";

interface GalleryImageManagerProps {
  value: string[];
  onChange: (value: string[]) => void;
  institutionName?: string;
  institutionLocation?: string;
  institutionProviderType?: string;
}

export function GalleryImageManager({
  value = [],
  onChange,
  institutionName,
  institutionLocation,
  institutionProviderType,
}: GalleryImageManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "ai" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiRequest("POST", "/api/university/upload-gallery-image", formData, {
        headers: {
          // Let browser set Content-Type with boundary for multipart/form-data
        },
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      onChange([...value, data.imagePath]);
      toast({
        title: "Image uploaded",
        description: "Gallery image has been uploaded successfully",
      });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI generation mutation
  const aiGenerateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/university/generate-gallery-image", { prompt });
      return await response.json();
    },
    onSuccess: (data: any) => {
      onChange([...value, data.imagePath]);
      toast({
        title: "Image generated",
        description: "AI-generated gallery image has been created successfully",
      });
      setAiPrompt("");
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) {
      toast({
        title: "URL required",
        description: "Please enter an image URL",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
      onChange([...value, urlInput.trim()]);
      setUrlInput("");
      setDialogOpen(false);
      toast({
        title: "URL added",
        description: "Image URL has been added to gallery",
      });
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
    }
  };

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) {
      // Use default prompt if none provided
      const defaultPrompt = `A beautiful campus view of ${institutionName || 'the university'} in ${institutionLocation || 'the location'}. Modern architecture, students, sunny day, professional photography`;
      aiGenerateMutation.mutate(defaultPrompt);
    } else {
      aiGenerateMutation.mutate(aiPrompt.trim());
    }
  };

  const handleRemoveImage = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
    toast({
      title: "Image removed",
      description: "Gallery image has been removed",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Gallery Images ({value.length})</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          data-testid="button-add-gallery-image"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Add Image
        </Button>
      </div>

      {/* Current Images Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((imageUrl, index) => (
            <div
              key={index}
              className="relative aspect-[3/2] rounded-lg border bg-muted overflow-hidden group"
              data-testid={`gallery-image-${index}`}
            >
              <img
                src={imageUrl}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback for broken images
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveImage(index)}
                  data-testid={`button-remove-gallery-${index}`}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg bg-muted/30">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            No gallery images yet. Add images by uploading, generating with AI, or entering URLs.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            data-testid="button-add-first-gallery-image"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Add Your First Image
          </Button>
        </div>
      )}

      {/* Add Image Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Gallery Image</DialogTitle>
            <DialogDescription>
              Choose how you want to add an image to the gallery
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" data-testid="tab-upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="ai" data-testid="tab-ai-generate">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </TabsTrigger>
              <TabsTrigger value="url" data-testid="tab-url">
                <LinkIcon className="h-4 w-4 mr-2" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Image File</Label>
                <p className="text-sm text-muted-foreground">
                  Select an image file (max 10MB). Will be resized to 600x400px.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-gallery-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="w-full"
                  data-testid="button-select-file"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Select Image File
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">AI Image Prompt (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Describe the campus image you want to generate. Leave blank for a default beautiful campus view.
                </p>
                <Input
                  id="ai-prompt"
                  placeholder={`e.g., "Modern lecture hall with students" or "Campus library with study areas"`}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={aiGenerateMutation.isPending}
                  data-testid="input-ai-prompt"
                />
              </div>
              <Button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiGenerateMutation.isPending}
                className="w-full"
                data-testid="button-generate-ai-image"
              >
                {aiGenerateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <p className="text-sm text-muted-foreground">
                  Enter the full URL of an image hosted elsewhere
                </p>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  data-testid="input-image-url"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddUrl}
                className="w-full"
                data-testid="button-add-url"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Add URL
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setUrlInput("");
                setAiPrompt("");
              }}
              data-testid="button-cancel-add-image"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
