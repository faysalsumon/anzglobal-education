import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bot, Save, Loader2, Sparkles, Zap, Brain, Check } from "lucide-react";

interface AiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

interface AiSetting {
  id: string;
  settingKey: string;
  provider: string;
  modelId: string;
  modelDisplayName: string | null;
  maxTokens: number | null;
  temperature: number | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function AdminAiSettingsPanel() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [maxTokens, setMaxTokens] = useState<number>(4096);
  const [temperature, setTemperature] = useState<number>(0.7);

  const { data: models, isLoading: modelsLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/admin/ai-models"],
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<AiSetting[]>({
    queryKey: ["/api/admin/ai-settings"],
    staleTime: 0,
  });

  const currentSetting = settings?.find(s => s.settingKey === "default_model");
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { modelId: string; maxTokens: number; temperature: number }) => {
      const model = models?.find(m => m.id === data.modelId);
      return apiRequest("PUT", "/api/admin/ai-settings/default_model", {
        modelId: data.modelId,
        provider: model?.provider || "openrouter",
        modelDisplayName: model?.name || data.modelId,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
      toast({
        title: "Settings Updated",
        description: "AI model configuration has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update AI settings.",
        variant: "destructive",
      });
    },
  });

  const effectiveModel = selectedModel || currentSetting?.modelId || "anthropic/claude-3.5-sonnet";
  const effectiveMaxTokens = maxTokens;
  const effectiveTemperature = temperature;

  const handleSave = () => {
    updateSettingsMutation.mutate({
      modelId: effectiveModel,
      maxTokens: effectiveMaxTokens,
      temperature: effectiveTemperature,
    });
  };

  if (modelsLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentModelInfo = models?.find(m => m.id === effectiveModel);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Settings</h2>
          <p className="text-muted-foreground">
            Configure the AI model used for generating qualification equivalencies and entry requirements
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Model Selection
            </CardTitle>
            <CardDescription>
              Choose the AI model for academic qualification matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-select">AI Model</Label>
              <Select 
                value={effectiveModel} 
                onValueChange={setSelectedModel}
              >
                <SelectTrigger id="model-select" data-testid="select-ai-model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models?.map((model) => (
                    <SelectItem key={model.id} value={model.id} data-testid={`select-item-${model.id}`}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <Badge className="text-xs bg-[#6366f1] text-white border-[#6366f1]">
                          {model.provider}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentModelInfo && (
                <p className="text-sm text-muted-foreground">{currentModelInfo.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens: {maxTokens}</Label>
              <Slider
                id="max-tokens"
                value={[maxTokens]}
                onValueChange={(value) => setMaxTokens(value[0])}
                min={1024}
                max={8192}
                step={512}
                className="py-2"
                data-testid="slider-max-tokens"
              />
              <p className="text-xs text-muted-foreground">
                Maximum response length for AI generations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature: {temperature.toFixed(1)}</Label>
              <Slider
                id="temperature"
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
                min={0}
                max={1}
                step={0.1}
                className="py-2"
                data-testid="slider-temperature"
              />
              <p className="text-xs text-muted-foreground">
                Higher values = more creative, lower = more precise
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Current Configuration
            </CardTitle>
            <CardDescription>
              Active AI settings for the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Model</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {currentSetting?.modelDisplayName || currentSetting?.modelId || "Not configured"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Provider</span>
                <span className="text-sm text-muted-foreground capitalize">
                  {currentSetting?.provider || "OpenRouter"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Max Tokens</span>
                <span className="text-sm text-muted-foreground">
                  {currentSetting?.maxTokens || 4096}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Temperature</span>
                <span className="text-sm text-muted-foreground">
                  {currentSetting?.temperature || 0.7}
                </span>
              </div>
              {currentSetting?.updatedAt && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Last updated</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(currentSetting.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full" 
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-ai-settings"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About OpenRouter</CardTitle>
          <CardDescription>
            How AI model access works in StudyMatch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Multiple Models</h4>
                <p className="text-sm text-muted-foreground">
                  Access Claude, GPT-4, Gemini and more through one API
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Automatic Fallback</h4>
                <p className="text-sm text-muted-foreground">
                  If one model is unavailable, the system tries alternatives
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Cost Effective</h4>
                <p className="text-sm text-muted-foreground">
                  Pay only for what you use with unified billing
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
