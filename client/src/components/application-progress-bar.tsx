import { CheckCircle } from "lucide-react";
import { 
  ApplicationStage, 
  STUDENT_STAGES, 
  getStudentStageIndex, 
  calculateStudentProgress,
  STAGE_CONFIG
} from "@/lib/stage-config";

interface ApplicationProgressBarProps {
  currentStage: ApplicationStage;
  showInternalStage?: boolean;
  compact?: boolean;
}

export function ApplicationProgressBar({ 
  currentStage, 
  showInternalStage = false,
  compact = false 
}: ApplicationProgressBarProps) {
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
