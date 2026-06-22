import { CheckCircle, Trophy, XCircle, AlertCircle } from "lucide-react";
import { 
  ApplicationStage, 
  STUDENT_STAGES, 
  ACTIVE_STAGES,
  TERMINAL_STAGES,
  getStudentStageIndex, 
  calculateStudentProgress,
  STAGE_CONFIG
} from "@/lib/stage-config";

interface ApplicationProgressBarProps {
  currentStage: ApplicationStage;
  showInternalStage?: boolean;
  compact?: boolean;
  adminView?: boolean;
}

function calculateAdminProgress(stage: ApplicationStage): number {
  if (stage === "Application Won") return 100;
  if (stage === "Refusal/Refunds" || stage === "Application Lost") return 0;
  const index = ACTIVE_STAGES.indexOf(stage);
  if (index < 0) return 0;
  return Math.round(((index + 1) / ACTIVE_STAGES.length) * 100);
}

function AdminProgressBar({ currentStage }: { currentStage: ApplicationStage }) {
  const isTerminal = TERMINAL_STAGES.includes(currentStage);
  const activeIndex = ACTIVE_STAGES.indexOf(currentStage);
  const progressPercentage = calculateAdminProgress(currentStage);

  const terminalConfig: Record<string, { icon: typeof Trophy; label: string; colorClass: string; bgClass: string }> = {
    "Application Won": {
      icon: Trophy,
      label: "Application Won",
      colorClass: "text-green-600 dark:text-green-400",
      bgClass: "bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800",
    },
    "Refusal/Refunds": {
      icon: AlertCircle,
      label: "Refusal / Refunds",
      colorClass: "text-purple-600 dark:text-purple-400",
      bgClass: "bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800",
    },
    "Application Lost": {
      icon: XCircle,
      label: "Application Lost",
      colorClass: "text-red-600 dark:text-red-400",
      bgClass: "bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Application Progress</h4>
        <div className="flex items-center gap-2">
          {isTerminal ? (
            <span className={`text-sm font-semibold ${terminalConfig[currentStage]?.colorClass}`}>
              {terminalConfig[currentStage]?.label}
            </span>
          ) : (
            <>
              <span className="text-2xl font-bold text-primary">{progressPercentage}%</span>
              <span className="text-xs text-muted-foreground">complete</span>
            </>
          )}
        </div>
      </div>

      {isTerminal ? (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${terminalConfig[currentStage]?.bgClass}`}>
          {(() => {
            const cfg = terminalConfig[currentStage];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <>
                <Icon className={`h-8 w-8 flex-shrink-0 ${cfg.colorClass}`} />
                <div>
                  <p className={`font-semibold ${cfg.colorClass}`}>{cfg.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {STAGE_CONFIG[currentStage]?.description}
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="absolute top-0 left-0 right-0 h-3 flex items-center">
              {ACTIVE_STAGES.map((stage, index) => {
                const position = ((index + 1) / ACTIVE_STAGES.length) * 100;
                const isCompleted = index < activeIndex;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={stage}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${position}%` }}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                      isCompleted ? "bg-white border-white" :
                      isActive ? "bg-white border-primary ring-2 ring-primary/30" :
                      "bg-muted border-muted-foreground/30"
                    }`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between text-xs gap-1">
            {ACTIVE_STAGES.map((stage, index) => {
              const isCompleted = index < activeIndex;
              const isActive = index === activeIndex;
              const label = STAGE_CONFIG[stage]?.displayName || stage;
              return (
                <div
                  key={stage}
                  className={`flex flex-col items-center text-center flex-1 ${
                    isActive ? "text-primary font-medium" :
                    isCompleted ? "text-foreground" :
                    "text-muted-foreground"
                  }`}
                  data-testid={`admin-stage-label-${stage}`}
                >
                  {isActive && (
                    <div className="relative mb-1">
                      <span className="absolute -inset-1 rounded-full bg-primary/20 animate-ping" />
                      <div className="relative w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  {!isActive && !isCompleted && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mb-1">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                  <span className="leading-tight text-[10px] sm:text-xs">{label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
                <span className="text-lg font-bold">{activeIndex + 1}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Current Stage</p>
              <p className="font-semibold text-primary truncate">{STAGE_CONFIG[currentStage]?.displayName || currentStage}</p>
            </div>
            {activeIndex < ACTIVE_STAGES.length - 1 && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">Next</p>
                <p className="text-sm font-medium truncate">
                  {STAGE_CONFIG[ACTIVE_STAGES[activeIndex + 1]]?.displayName || ACTIVE_STAGES[activeIndex + 1]}
                </p>
              </div>
            )}
            {activeIndex === ACTIVE_STAGES.length - 1 && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Final Stage</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ApplicationProgressBar({ 
  currentStage, 
  showInternalStage = false,
  compact = false,
  adminView = false,
}: ApplicationProgressBarProps) {
  if (adminView) {
    return <AdminProgressBar currentStage={currentStage} />;
  }

  const currentStudentStageIndex = getStudentStageIndex(currentStage);
  const progressPercentage = calculateStudentProgress(currentStage);
  const currentStageNumber = currentStudentStageIndex >= 0 ? currentStudentStageIndex + 1 : 1;
  const currentStudentStage = currentStudentStageIndex >= 0 
    ? STUDENT_STAGES[currentStudentStageIndex] 
    : STUDENT_STAGES[0];
  const nextStudentStageIndex = currentStudentStageIndex + 1;
  const nextStudentStage = nextStudentStageIndex < STUDENT_STAGES.length 
    ? STUDENT_STAGES[nextStudentStageIndex] 
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Application Progress</h4>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{progressPercentage}%</span>
          <span className="text-xs text-muted-foreground">complete</span>
        </div>
      </div>

      <div className="relative">
        <div className={`${compact ? 'h-2' : 'h-3'} bg-muted rounded-full overflow-hidden`}>
          <div 
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" 
              style={{ 
                animation: 'shimmer 2s infinite linear',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              }} 
            />
          </div>
        </div>
        
        <div className={`absolute top-0 left-0 right-0 ${compact ? 'h-2' : 'h-3'} flex items-center`}>
          {STUDENT_STAGES.map((stage, index) => {
            const position = ((index + 1) / STUDENT_STAGES.length) * 100;
            const isCompleted = index < currentStudentStageIndex;
            const isActive = index === currentStudentStageIndex;
            
            return (
              <div 
                key={stage.id}
                className="absolute -translate-x-1/2"
                style={{ left: `${position}%` }}
              >
                <div className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full border-2 ${
                  isCompleted ? 'bg-white border-white' : 
                  isActive ? 'bg-white border-primary ring-2 ring-primary/30' : 
                  'bg-muted border-muted-foreground/30'
                }`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between text-xs gap-1">
        {STUDENT_STAGES.map((stage, index) => {
          const isCompleted = index < currentStudentStageIndex;
          const isActive = index === currentStudentStageIndex;
          
          return (
            <div 
              key={stage.id}
              className={`flex flex-col items-center text-center flex-1 ${
                isActive ? 'text-primary font-medium' : 
                isCompleted ? 'text-foreground' : 
                'text-muted-foreground'
              }`}
              data-testid={`stage-label-${stage.id}`}
            >
              {isActive && (
                <div className="relative mb-1">
                  <span className="absolute -inset-1 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
              )}
              {isCompleted && (
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              )}
              {!isActive && !isCompleted && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mb-1">
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                </div>
              )}
              <span className="leading-tight text-[10px] sm:text-xs">{stage.name}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
            <span className="text-lg font-bold">{currentStageNumber}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Current Stage</p>
          <p className="font-semibold text-primary truncate">{currentStudentStage.name}</p>
          {showInternalStage && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Internal: {STAGE_CONFIG[currentStage]?.displayName || currentStage}
            </p>
          )}
        </div>
        {nextStudentStage && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">Next</p>
            <p className="text-sm font-medium truncate">{nextStudentStage.name}</p>
          </div>
        )}
        {!nextStudentStage && currentStudentStageIndex === STUDENT_STAGES.length - 1 && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Final Stage</span>
          </div>
        )}
      </div>
    </div>
  );
}
