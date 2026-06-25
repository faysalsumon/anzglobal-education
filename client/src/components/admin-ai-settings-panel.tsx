/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bot,
  Save,
  Loader2,
  MessageSquare,
  GraduationCap,
  Image,
  Globe,
  Sparkles,
  Database,
  ShieldCheck,
  RefreshCw,
  Check,
  HardDriveUpload,
  FolderSync,
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  XCircle,
} from "lucide-react";

interface AiModel {
  id: string;
  name: string;
  provider: string;
  isFree: boolean;
  contextLength: number | null;
  description: string | null;
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

type AiSettingsMap = Record<string, AiSetting>;

interface JobConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultModel: string;
  defaultMaxTokens: number;
  defaultTemperature: number;
}

const JOB_CONFIGS: JobConfig[] = [
  {
    key: "guest_chat",
    label: "Guest Chat (Zan)",
    description: "Public chatbot for unregistered visitors — cost-sensitive, free models preferred.",
    icon: Bot,
    defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
    defaultMaxTokens: 800,
    defaultTemperature: 0.7,
  },
  {
    key: "student_chat",
    label: "Student Chat (Zan)",
    description: "Authenticated student conversations — richer context, higher quality preferred.",
    icon: MessageSquare,
    defaultModel: "openai/gpt-4o-mini",
    defaultMaxTokens: 1000,
    defaultTemperature: 0.7,
  },
  {
    key: "qualification_matching",
    label: "Qualification Matching",
    description: "Academic equivalency generation and entry requirements suggestions.",
    icon: GraduationCap,
    defaultModel: "anthropic/claude-3.5-sonnet",
    defaultMaxTokens: 1000,
    defaultTemperature: 0.3,
  },
  {
    key: "document_verification",
    label: "Document Verification",
    description: "Student document analysis and authenticity checks.",
    icon: ShieldCheck,
    defaultModel: "openai/gpt-4o",
    defaultMaxTokens: 2000,
    defaultTemperature: 0.2,
  },
  {
    key: "image_generation",
    label: "Image Generation",
    description: "Course thumbnail prompt creation and visual content descriptions.",
    icon: Image,
    defaultModel: "openai/gpt-4o",
    defaultMaxTokens: 1000,
    defaultTemperature: 0.7,
  },
  {
    key: "web_scraping",
    label: "Web Scraping & ZAN Data Entry",
    description: "Course/institution extraction from websites and ZAN agentic data entry.",
    icon: Globe,
    defaultModel: "openai/gpt-4o-mini",
    defaultMaxTokens: 3000,
    defaultTemperature: 0.2,
  },
  {
    key: "content_generation",
    label: "Content Generation",
    description: "Marketing copy, course descriptions, bios, and career narratives.",
    icon: Sparkles,
    defaultModel: "anthropic/claude-3.5-sonnet",
    defaultMaxTokens: 1000,
    defaultTemperature: 0.7,
  },
  {
    key: "data_extraction",
    label: "Data Extraction",
    description: "Natural language search query parsing and structured data extraction.",
    icon: Database,
    defaultModel: "openai/gpt-4o-mini",
    defaultMaxTokens: 500,
    defaultTemperature: 0.2,
  },
];

interface RowState {
  modelId: string;
  maxTokens: number;
  temperature: number;
}

function groupModelsByProvider(models: AiModel[]): Record<string, AiModel[]> {
  const groups: Record<string, AiModel[]> = {};
  for (const m of models) {
    const p = m.provider || "other";
    if (!groups[p]) groups[p] = [];
    groups[p].push(m);
  }
  return groups;
}

function providerLabel(slug: string): string {
  const map: Record<string, string> = {
    "anthropic": "Anthropic",
    "openai": "OpenAI",
    "google": "Google",
    "meta-llama": "Meta Llama",
    "mistralai": "Mistral AI",
    "cohere": "Cohere",
    "perplexity": "Perplexity",
    "nvidia": "NVIDIA",
    "qwen": "Qwen (Alibaba)",
    "deepseek": "DeepSeek",
    "x-ai": "xAI (Grok)",
  };
  return map[slug] ?? slug;
}

interface MigrationCategoryResult {
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
}

interface MigrationResults {
  [category: string]: MigrationCategoryResult;
}

interface ReplitMigStats {
  total: number;
  copied: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface ReplitMigrationState {
  status: "idle" | "running" | "completed" | "failed";
  startedAt: number | null;
  finishedAt: number | null;
  stats: ReplitMigStats;
  currentPrefix: string | null;
  recentLog: string[];
  error?: string;
}

interface NeonMigrationState {
  status: "idle" | "running" | "completed" | "failed";
  startedAt: number | null;
  finishedAt: number | null;
  tablesTotal: number;
  tablesDone: number;
  rowsCopied: number;
  currentTable: string | null;
  recentLog: string[];
  error?: string;
}

export function AdminAiSettingsPanel() {
  const { toast } = useToast();
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [migrationResults, setMigrationResults] = useState<MigrationResults | null>(null);

  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useQuery<AiModel[]>({
    queryKey: ["/api/admin/ai-models"],
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<AiSettingsMap>({
    queryKey: ["/api/admin/ai-settings"],
    staleTime: 0,
  });

  // Initialise row states from DB settings (keyed map) or job defaults
  useEffect(() => {
    if (!settings) return;
    const initial: Record<string, RowState> = {};
    for (const job of JOB_CONFIGS) {
      const saved = settings[job.key];
      initial[job.key] = {
        modelId: saved?.modelId || job.defaultModel,
        maxTokens: saved?.maxTokens ?? job.defaultMaxTokens,
        temperature: saved?.temperature ?? job.defaultTemperature,
      };
    }
    setRowStates(initial);
  }, [settings]);

  const bulkSaveMutation = useMutation({
    mutationFn: async (payload: Record<string, RowState>) => {
      const settingsPayload: Record<string, any> = {};
      for (const [key, state] of Object.entries(payload)) {
        const model = models?.find((m) => m.id === state.modelId);
        settingsPayload[key] = {
          modelId: state.modelId,
          provider: model?.provider || "openrouter",
          modelDisplayName: model?.name || state.modelId,
          maxTokens: state.maxTokens,
          temperature: state.temperature,
        };
      }
      return apiRequest("PUT", "/api/admin/ai-settings/bulk", { settings: settingsPayload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
      setSavedKeys(new Set(JOB_CONFIGS.map((j) => j.key)));
      setTimeout(() => setSavedKeys(new Set()), 2500);
      toast({
        title: "AI settings saved",
        description: "All job model configurations have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save AI settings.",
        variant: "destructive",
      });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/migrate-local-files");
      return res.json();
    },
    onSuccess: (data: { success: boolean; results: MigrationResults }) => {
      setMigrationResults(data.results);
      const total = Object.values(data.results).reduce((sum, r) => sum + r.total, 0);
      const uploaded = Object.values(data.results).reduce((sum, r) => sum + r.uploaded, 0);
      const failed = Object.values(data.results).reduce((sum, r) => sum + r.failed, 0);
      toast({
        title: "Migration complete",
        description: `${uploaded} of ${total} files uploaded${failed > 0 ? `, ${failed} failed` : ""}.`,
        variant: failed > 0 ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Migration failed",
        description: error.message || "An error occurred during migration.",
        variant: "destructive",
      });
    },
  });

  const { data: replitMigStatus, refetch: refetchReplitMig } = useQuery<ReplitMigrationState>({
    queryKey: ["/api/admin/migrate-replit-to-supabase/status"],
    refetchInterval: (query) => {
      const data = query.state.data as ReplitMigrationState | undefined;
      return data?.status === "running" ? 3000 : false;
    },
    retry: false,
  });

  const startReplitMigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/migrate-replit-to-supabase");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/migrate-replit-to-supabase/status"] });
      toast({ title: "Migration started", description: "Files are being copied to Supabase in the background." });
    },
    onError: (error: Error) => {
      toast({ title: "Migration failed to start", description: error.message, variant: "destructive" });
    },
  });

  const { data: neonMigStatus, refetch: refetchNeonMig } = useQuery<NeonMigrationState>({
    queryKey: ["/api/admin/migrate-neon-to-supabase/status"],
    refetchInterval: (query) => {
      const data = query.state.data as NeonMigrationState | undefined;
      return data?.status === "running" ? 2000 : false;
    },
    retry: false,
  });

  const startNeonMigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/migrate-neon-to-supabase");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/migrate-neon-to-supabase/status"] });
      toast({ title: "Data migration started", description: "Copying Neon data to Supabase in the background." });
    },
    onError: (error: Error) => {
      toast({ title: "Migration failed to start", description: error.message, variant: "destructive" });
    },
  });

  const updateRow = (jobKey: string, patch: Partial<RowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [jobKey]: { ...prev[jobKey], ...patch },
    }));
  };

  const isLoading = modelsLoading || settingsLoading;
  const groupedModels = models ? groupModelsByProvider(models) : {};
  const providerSlugs = Object.keys(groupedModels).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Model Router</h2>
            <p className="text-muted-foreground text-sm">
              Assign an independent model to each AI task type — powered by the live OpenRouter catalog.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => refetchModels()}
            disabled={modelsLoading}
            data-testid="button-refresh-models"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${modelsLoading ? "animate-spin" : ""}`} />
            Refresh Catalog
          </Button>
          <Button
            onClick={() => bulkSaveMutation.mutate(rowStates)}
            disabled={bulkSaveMutation.isPending || isLoading}
            data-testid="button-save-all-ai-settings"
          >
            {bulkSaveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      {models && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="gap-1 text-xs">
            {models.length} models in catalog
          </Badge>
          <Badge variant="secondary" className="gap-1 text-xs">
            {models.filter((m) => m.isFree).length} free models
          </Badge>
          <Badge variant="secondary" className="gap-1 text-xs">
            {providerSlugs.length} providers
          </Badge>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {JOB_CONFIGS.map((job) => {
            const row = rowStates[job.key] ?? {
              modelId: job.defaultModel,
              maxTokens: job.defaultMaxTokens,
              temperature: job.defaultTemperature,
            };
            const Icon = job.icon;
            const isSaved = savedKeys.has(job.key);
            const activeModel = models?.find((m) => m.id === row.modelId);

            return (
              <Card key={job.key} data-testid={`card-ai-job-${job.key}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{job.label}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{job.description}</CardDescription>
                    </div>
                  </div>
                  {isSaved && (
                    <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                      <Check className="h-3 w-3" /> Saved
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Model dropdown */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Model</Label>
                      <Select
                        value={row.modelId}
                        onValueChange={(val) => updateRow(job.key, { modelId: val })}
                      >
                        <SelectTrigger data-testid={`select-model-${job.key}`} className="text-xs">
                          <SelectValue>
                            <span className="flex items-center gap-2 text-xs">
                              {activeModel?.name || row.modelId}
                              {activeModel?.isFree && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1">Free</Badge>
                              )}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {providerSlugs.map((slug) => (
                            <SelectGroup key={slug}>
                              <SelectLabel className="text-xs">{providerLabel(slug)}</SelectLabel>
                              {groupedModels[slug].map((m) => (
                                <SelectItem
                                  key={m.id}
                                  value={m.id}
                                  data-testid={`option-${job.key}-${m.id}`}
                                >
                                  <span className="flex items-center gap-2 text-xs">
                                    <span className="truncate max-w-[220px]">{m.name}</span>
                                    {m.isFree && (
                                      <Badge variant="secondary" className="text-[10px] py-0 px-1 shrink-0">Free</Badge>
                                    )}
                                    {m.contextLength && (
                                      <span className="text-muted-foreground shrink-0">
                                        {m.contextLength >= 1000000
                                          ? `${(m.contextLength / 1000000).toFixed(0)}M ctx`
                                          : m.contextLength >= 1000
                                          ? `${Math.round(m.contextLength / 1000)}k ctx`
                                          : `${m.contextLength} ctx`}
                                      </span>
                                    )}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeModel?.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{activeModel.description}</p>
                      )}
                    </div>

                    {/* Temperature + Max tokens side-by-side */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Temperature: <span className="font-medium text-foreground">{row.temperature.toFixed(1)}</span>
                        </Label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={row.temperature}
                          onChange={(e) => updateRow(job.key, { temperature: parseFloat(e.target.value) })}
                          className="w-full accent-primary"
                          data-testid={`slider-temp-${job.key}`}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Precise</span>
                          <span>Creative</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Max tokens: <span className="font-medium text-foreground">{row.maxTokens.toLocaleString()}</span>
                        </Label>
                        <input
                          type="range"
                          min={256}
                          max={8192}
                          step={256}
                          value={row.maxTokens}
                          onChange={(e) => updateRow(job.key, { maxTokens: parseInt(e.target.value) })}
                          className="w-full accent-primary"
                          data-testid={`slider-tokens-${job.key}`}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer save button (convenience) */}
      <div className="flex justify-end">
        <Button
          onClick={() => bulkSaveMutation.mutate(rowStates)}
          disabled={bulkSaveMutation.isPending || isLoading}
          data-testid="button-save-all-ai-settings-footer"
        >
          {bulkSaveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Configurations
            </>
          )}
        </Button>
      </div>

      {/* System Maintenance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FolderSync className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">System Maintenance</CardTitle>
          </div>
          <CardDescription>
            One-time actions for platform administrators.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Migrate Local Files to Storage</p>
              <p className="text-xs text-muted-foreground">
                Copies any files previously stored on the local disk (logos, documents, etc.) into Object Storage.
                Run once after deployment. Files already in Object Storage are skipped automatically.
              </p>
            </div>
            <Button
              data-testid="button-migrate-local-files"
              onClick={() => migrateMutation.mutate()}
              disabled={migrateMutation.isPending}
              className="shrink-0"
            >
              {migrateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating…
                </>
              ) : (
                <>
                  <HardDriveUpload className="mr-2 h-4 w-4" />
                  Run Migration
                </>
              )}
            </Button>
          </div>

          {migrationResults && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Migration Results</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(migrationResults).map(([category, r]) => {
                  const hasFailures = r.failed > 0;
                  return (
                    <div key={category} className="flex items-start gap-2 rounded-md border bg-background p-2">
                      {hasFailures ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium capitalize">{category.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.uploaded} uploaded · {r.skipped} skipped
                          {r.failed > 0 && <span className="text-destructive"> · {r.failed} failed</span>}
                          <span className="text-muted-foreground/60"> / {r.total} total</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t pt-4" />

          {/* Replit → Supabase Storage Migration */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Migrate Replit Storage to Supabase</p>
              <p className="text-xs text-muted-foreground">
                Copies all legacy files from Replit Object Storage into Supabase buckets (anz-public / anz-private).
                Runs in the background — safe to navigate away. Already-migrated files are skipped.
              </p>
              {replitMigStatus && replitMigStatus.status !== "idle" && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {replitMigStatus.status === "running" && (
                    <Badge variant="secondary" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Running{replitMigStatus.currentPrefix ? ` — ${replitMigStatus.currentPrefix}` : "…"}
                    </Badge>
                  )}
                  {replitMigStatus.status === "completed" && (
                    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                  {replitMigStatus.status === "failed" && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {replitMigStatus.stats.copied} copied · {replitMigStatus.stats.skipped} skipped
                    {replitMigStatus.stats.failed > 0 && (
                      <span className="text-destructive"> · {replitMigStatus.stats.failed} failed</span>
                    )}
                    {replitMigStatus.stats.total > 0 && (
                      <span className="text-muted-foreground/60"> / {replitMigStatus.stats.total} total</span>
                    )}
                  </span>
                  {replitMigStatus.status === "running" && (
                    <button
                      className="text-muted-foreground underline underline-offset-2"
                      onClick={() => refetchReplitMig()}
                    >
                      Refresh
                    </button>
                  )}
                </div>
              )}
              {replitMigStatus?.status === "failed" && replitMigStatus.error && (
                <p className="mt-1 text-xs text-destructive">{replitMigStatus.error}</p>
              )}
            </div>
            <Button
              data-testid="button-migrate-replit-to-supabase"
              onClick={() => startReplitMigMutation.mutate()}
              disabled={startReplitMigMutation.isPending || replitMigStatus?.status === "running"}
              className="shrink-0"
            >
              {startReplitMigMutation.isPending || replitMigStatus?.status === "running" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : replitMigStatus?.status === "completed" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Run Again
                </>
              ) : (
                <>
                  <CloudUpload className="mr-2 h-4 w-4" />
                  Start Migration
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4" />

          {/* Neon → Supabase Data Migration */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Migrate Neon Data to Supabase</p>
              <p className="text-xs text-muted-foreground">
                Copies all app data from Neon (dev database) into Supabase (production). Run this once after
                deploying to production. Already-existing rows are skipped — safe to re-run.
                Requires the production server to have access to both{" "}
                <code className="font-mono">DATABASE_URL</code> (Neon) and{" "}
                <code className="font-mono">SUPABASE_DB_DIRECT_URL</code>.
              </p>
              {neonMigStatus && neonMigStatus.status !== "idle" && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {neonMigStatus.status === "running" && (
                    <Badge variant="secondary" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Running{neonMigStatus.currentTable ? ` — ${neonMigStatus.currentTable}` : "…"}
                    </Badge>
                  )}
                  {neonMigStatus.status === "completed" && (
                    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                  {neonMigStatus.status === "failed" && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {neonMigStatus.rowsCopied} rows copied
                    {neonMigStatus.tablesTotal > 0 && (
                      <span className="text-muted-foreground/60">
                        {" "}· {neonMigStatus.tablesDone}/{neonMigStatus.tablesTotal} tables
                      </span>
                    )}
                  </span>
                  {neonMigStatus.status === "running" && (
                    <button
                      className="text-muted-foreground underline underline-offset-2"
                      onClick={() => refetchNeonMig()}
                    >
                      Refresh
                    </button>
                  )}
                </div>
              )}
              {neonMigStatus?.recentLog && neonMigStatus.recentLog.length > 0 && (
                <div className="mt-2 max-h-28 overflow-y-auto rounded border bg-muted/40 p-2">
                  {neonMigStatus.recentLog.slice(-10).map((line, i) => (
                    <p key={i} className="font-mono text-xs text-muted-foreground leading-relaxed">{line}</p>
                  ))}
                </div>
              )}
              {neonMigStatus?.status === "failed" && neonMigStatus.error && (
                <p className="mt-1 text-xs text-destructive">{neonMigStatus.error}</p>
              )}
            </div>
            <Button
              data-testid="button-migrate-neon-to-supabase"
              onClick={() => startNeonMigMutation.mutate()}
              disabled={startNeonMigMutation.isPending || neonMigStatus?.status === "running"}
              className="shrink-0"
            >
              {startNeonMigMutation.isPending || neonMigStatus?.status === "running" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : neonMigStatus?.status === "completed" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Run Again
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Start Migration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info footer */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Live OpenRouter Catalog</p>
                <p className="text-xs text-muted-foreground">
                  Models fetched from OpenRouter API and cached for 1 hour. Use Refresh Catalog to update.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Per-Job Routing</p>
                <p className="text-xs text-muted-foreground">
                  Each task type uses its own independently configured model — no more one-size-fits-all.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Free Tier Support</p>
                <p className="text-xs text-muted-foreground">
                  Guest Chat defaults to a free Llama model — saving costs for anonymous traffic.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
