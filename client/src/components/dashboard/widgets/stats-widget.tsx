import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  color?: "default" | "primary" | "success" | "warning" | "danger";
}

interface StatsWidgetProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const colorClasses = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-green-600 dark:text-green-500",
  warning: "text-yellow-600 dark:text-yellow-500",
  danger: "text-red-600 dark:text-red-500",
};

const iconBgClasses = {
  default: "bg-muted",
  primary: "bg-primary/10",
  success: "bg-green-100 dark:bg-green-900/30",
  warning: "bg-yellow-100 dark:bg-yellow-900/30",
  danger: "bg-red-100 dark:bg-red-900/30",
};

export function StatsWidget({ stats, columns = 4, className }: StatsWidgetProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
    </div>
  );
}

function StatCard({ stat }: { stat: StatItem }) {
  const color = stat.color || "default";

  return (
    <Card className="overflow-hidden" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </p>
            <p className={cn("text-2xl font-bold", colorClasses[color])}>
              {stat.value}
            </p>
          </div>
          {stat.icon && (
            <div className={cn("p-2 rounded-lg", iconBgClasses[color])}>
              {stat.icon}
            </div>
          )}
        </div>
        {stat.trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {stat.trend.value > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : stat.trend.value < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-600" />
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span
              className={cn(
                stat.trend.value > 0
                  ? "text-green-600"
                  : stat.trend.value < 0
                  ? "text-red-600"
                  : "text-muted-foreground"
              )}
            >
              {stat.trend.value > 0 ? "+" : ""}
              {stat.trend.value}%
            </span>
            {stat.trend.label && (
              <span className="text-muted-foreground">{stat.trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickStatRowProps {
  items: Array<{
    label: string;
    value: string | number;
    color?: "default" | "primary" | "success" | "warning" | "danger";
  }>;
  className?: string;
}

export function QuickStatRow({ items, className }: QuickStatRowProps) {
  return (
    <div className={cn("flex items-center gap-6 flex-wrap", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{item.label}:</span>
          <span
            className={cn(
              "text-sm font-semibold",
              colorClasses[item.color || "default"]
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
