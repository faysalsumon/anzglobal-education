/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, AlertTriangle, ArrowLeft, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ApplicationStage,
  ACTIVE_STAGES,
  TERMINAL_STAGES,
  STAGE_CONFIG,
  isBackwardTransition,
  isTerminalStage,
  getStageIndex,
} from "@/lib/stage-config";

interface ApplicationStageSelectorProps {
  applicationId: string;
  currentStage: ApplicationStage;
  onStageChange?: (newStage: ApplicationStage) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

export function ApplicationStageSelector({
  applicationId,
  currentStage,
  onStageChange,
  disabled = false,
  showLabel: _showLabel = true,
}: ApplicationStageSelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    targetStage: ApplicationStage | null;
    type: 'backward' | 'terminal' | null;
  }>({ open: false, targetStage: null, type: null });

  const transitionMutation = useMutation({
    mutationFn: async (toStage: ApplicationStage) => {
      return apiRequest("POST", "/api/admin/applications/transition-stage", {
        applicationId,
        toStage,
      });
    },
    onSuccess: (_data, toStage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "history"] });
      toast({
        title: "Stage Updated",
        description: `Application moved to ${STAGE_CONFIG[toStage].displayName}`,
      });
      onStageChange?.(toStage);
    },
    onError: (error: any) => {
      toast({
        title: "Stage Update Failed",
        description: error.message || "Could not update application stage",
        variant: "destructive",
      });
    },
  });

  const handleStageSelect = (stage: ApplicationStage) => {
    if (stage === currentStage) {
      setOpen(false);
      return;
    }

    const isBackward = isBackwardTransition(currentStage, stage);
    const isTerminal = isTerminalStage(stage);

    if (isBackward || isTerminal) {
      setConfirmDialog({
        open: true,
        targetStage: stage,
        type: isTerminal ? 'terminal' : 'backward',
      });
      setOpen(false);
    } else {
      transitionMutation.mutate(stage);
      setOpen(false);
    }
  };

  const handleConfirmTransition = () => {
    if (confirmDialog.targetStage) {
      transitionMutation.mutate(confirmDialog.targetStage);
    }
    setConfirmDialog({ open: false, targetStage: null, type: null });
  };

  const currentConfig = STAGE_CONFIG[currentStage];
  const currentIndex = getStageIndex(currentStage);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || transitionMutation.isPending}
            className="justify-between gap-2 min-w-[200px]"
            data-testid="button-stage-selector"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-3 w-3 rounded-full shrink-0",
                  currentConfig.dotColor
                )}
              />
              <span className="truncate">{currentConfig.displayName}</span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search stages..." data-testid="input-stage-search" />
            <CommandList>
              <CommandEmpty>No stage found.</CommandEmpty>
              <CommandGroup heading="Active Stages">
                {ACTIVE_STAGES.map((stage) => {
                  const config = STAGE_CONFIG[stage];
                  const stageIndex = getStageIndex(stage);
                  const _isCompleted = stageIndex < currentIndex;
                  const isCurrent = stage === currentStage;
                  const isBackward = stageIndex < currentIndex;

                  return (
                    <CommandItem
                      key={stage}
                      value={stage}
                      onSelect={() => handleStageSelect(stage)}
                      className="flex items-center gap-3 cursor-pointer"
                      data-testid={`stage-option-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full shrink-0",
                          config.dotColor
                        )}
                      />
                      <span className={cn(
                        "flex-1",
                        isCurrent && "font-medium text-primary"
                      )}>
                        {config.displayName}
                      </span>
                      {isCurrent && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      {isBackward && !isCurrent && (
                        <ArrowLeft className="h-3 w-3 text-muted-foreground" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Outcome Stages">
                {TERMINAL_STAGES.map((stage) => {
                  const config = STAGE_CONFIG[stage];
                  const isCurrent = stage === currentStage;

                  return (
                    <CommandItem
                      key={stage}
                      value={stage}
                      onSelect={() => handleStageSelect(stage)}
                      className="flex items-center gap-3 cursor-pointer"
                      data-testid={`stage-option-${stage.toLowerCase().replace(/[\s/]+/g, '-')}`}
                    >
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full shrink-0",
                          config.dotColor
                        )}
                      />
                      <span className={cn(
                        "flex-1",
                        isCurrent && "font-medium text-primary"
                      )}>
                        {config.displayName}
                      </span>
                      {isCurrent && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <Flag className="h-3 w-3 text-muted-foreground" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, targetStage: null, type: null })
        }
      >
        <AlertDialogContent data-testid="dialog-confirm-stage-change">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmDialog.type === 'terminal'
                ? "Move to Outcome Stage?"
                : "Move Backward?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'terminal' ? (
                <>
                  You are about to move this application to{" "}
                  <strong>
                    {confirmDialog.targetStage
                      ? STAGE_CONFIG[confirmDialog.targetStage].displayName
                      : ""}
                  </strong>
                  . This is a final outcome stage.
                  <br /><br />
                  This action may affect related tasks and notifications.
                </>
              ) : (
                <>
                  You are moving this application backward from{" "}
                  <strong>{currentConfig.displayName}</strong> to{" "}
                  <strong>
                    {confirmDialog.targetStage
                      ? STAGE_CONFIG[confirmDialog.targetStage].displayName
                      : ""}
                  </strong>
                  .
                  <br /><br />
                  This may require re-verification of previously completed steps.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-stage-change">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTransition}
              className={confirmDialog.type === 'terminal' ? "bg-amber-600 hover:bg-amber-700" : ""}
              data-testid="button-confirm-stage-change"
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface StageDotProps {
  stage: ApplicationStage;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StageDot({ stage, size = 'md', className }: StageDotProps) {
  const config = STAGE_CONFIG[stage];
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <span
      className={cn(
        "rounded-full shrink-0",
        sizeClasses[size],
        config.dotColor,
        className
      )}
      title={config.displayName}
    />
  );
}

interface StageBadgeProps {
  stage: ApplicationStage;
  showDot?: boolean;
  className?: string;
}

export function StageBadge({ stage, showDot = true, className }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage];

  return (
    <Badge className={cn(config.badgeClass, "gap-1.5", className)}>
      {showDot && <StageDot stage={stage} size="sm" />}
      {config.displayName}
    </Badge>
  );
}
