/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
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
  institutionProviderType: _institutionProviderType,
}: GalleryImageManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "ai" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [uploadProgress, setUploadProgress] = useState<{ total: number; completed: number; failed: number }>({ total: 0, completed: 0, failed: 0 });
  const [isUploading, setIsUploading] = useState(false);
  
  // Ref to track the latest value to avoid stale closures
  const valueRef = useRef<string[]>(value);
  
  // Keep ref in sync with latest value
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Upload mutation for single file
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiRequest("POST", "/api/admin/gallery/upload", formData);
      return await response.json();
    },
  });

  // AI generation mutation
  const aiGenerateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/admin/gallery/generate", { prompt });
      return await response.json();
    },
    onSuccess: (data: any) => {
      // Use ref to get latest value instead of stale closure
      const currentGalleryValue = valueRef.current;
      
      // Check if image already exists (handle concurrent additions)
      if (!currentGalleryValue.includes(data.imagePath)) {
        onChange([...currentGalleryValue, data.imagePath]);
      }
      
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count (max 6 files at once)
    if (files.length > 6) {
      toast({
        title: "Too many files",
        description: "Please select a maximum of 6 images at once",
        variant: "destructive",
      });
      return;
    }

    // Validate total gallery size
    if (value.length + files.length > 12) {
      toast({
        title: "Gallery limit reached",
        description: `You can have a maximum of 12 gallery images. You currently have ${value.length} images.`,
        variant: "destructive",
      });
      return;
    }

    // Validate each file
    const invalidFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) return true;
      if (file.size > 10 * 1024 * 1024) return true;
      return false;
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid files",
        description: "All files must be images under 10MB each",
        variant: "destructive",
      });
      return;
    }

    // Capture initial value for safety check using ref
    const initialGalleryValue = [...valueRef.current];

    // Upload files in parallel
    setIsUploading(true);
    setUploadProgress({ total: files.length, completed: 0, failed: 0 });

    // Track uploads
    let successCount = 0;
    let failedCount = 0;
    const newImagePaths: string[] = [];

    // Upload in parallel and collect results
    const uploadPromises = files.map(async (file) => {
      try {
        const data = await uploadMutation.mutateAsync(file);
        newImagePaths.push(data.imagePath);
        successCount++;
        setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        return { success: true, path: data.imagePath };
      } catch (error) {
        failedCount++;
        setUploadProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        console.error('Upload error:', error);
        return { success: false, path: null };
      }
    });

    await Promise.all(uploadPromises);

    setIsUploading(false);

    // Update gallery with all successful uploads at once
    if (newImagePaths.length > 0) {
      // Get the latest gallery value using ref (not stale closure)
      const currentGalleryValue = valueRef.current;
      
      // Safety check: verify gallery hasn't been modified during upload
      // This prevents overwriting concurrent modifications
      const galleryModified = currentGalleryValue.length !== initialGalleryValue.length ||
        !currentGalleryValue.every((img, idx) => img === initialGalleryValue[idx]);

      if (galleryModified) {
        // Gallery was modified during upload - merge cautiously
        // Only add images that don't already exist
        const currentImages = new Set(currentGalleryValue);
        const uniqueNewImages = newImagePaths.filter(path => !currentImages.has(path));
        if (uniqueNewImages.length > 0) {
          onChange([...currentGalleryValue, ...uniqueNewImages]);
        }
        toast({
          title: "Upload complete",
          description: `Uploaded ${uniqueNewImages.length} new images. Gallery was modified during upload.`,
        });
      } else {
        // Safe to append - gallery unchanged during upload
        onChange([...currentGalleryValue, ...newImagePaths]);
        
        // Show success toast
        if (successCount === files.length) {
          toast({
            title: "Upload complete",
            description: `Successfully uploaded ${successCount} image${successCount > 1 ? 's' : ''}`,
          });
        } else if (successCount > 0) {
          toast({
            title: "Partial upload",
            description: `Uploaded ${successCount} of ${files.length} images. ${failedCount} failed.`,
            variant: "destructive",
          });
        }
      }
    } else if (failedCount > 0) {
      // All uploads failed
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    }

    setDialogOpen(false);
    setUploadProgress({ total: 0, completed: 0, failed: 0 });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      
      // Use ref to get latest value instead of stale closure
      const currentGalleryValue = valueRef.current;
      const trimmedUrl = urlInput.trim();
      
      // Check if URL already exists (handle concurrent additions)
      if (!currentGalleryValue.includes(trimmedUrl)) {
        onChange([...currentGalleryValue, trimmedUrl]);
      }
      
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
    // Use ref to get latest value instead of stale closure
    const currentGalleryValue = valueRef.current;
    const newValue = currentGalleryValue.filter((_, i) => i !== index);
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
                <Label>Upload Image Files</Label>
                <p className="text-sm text-muted-foreground">
                  Select up to 6 images at once (max 10MB each). Images will be resized to 600x400px.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-gallery-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  data-testid="button-select-file"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading {uploadProgress.completed}/{uploadProgress.total}...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Select Images (up to 6)
                    </>
                  )}
                </Button>
                {isUploading && uploadProgress.total > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-muted-foreground">
                        {uploadProgress.completed + uploadProgress.failed}/{uploadProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{
                          width: `${((uploadProgress.completed + uploadProgress.failed) / uploadProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
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
