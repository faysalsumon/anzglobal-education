import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertTriangle, TrendingUp, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function FinanceDashboardPanel() {
  const { data: summary, isLoading } = useQuery<{
    outstanding: string;
    overdue: string;
    overdueCount: number;
    collectedThisMonth: string;
    incomeThisMonth: string;
  }>({
    queryKey: ["/api/accounting/summary"],
  });

  const formatCurrency = (val: string) => {
    const num = parseFloat(val || "0");
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(num);
  };

  const cards = [
    {
      title: "Outstanding",
      value: summary ? formatCurrency(summary.outstanding) : "",
      icon: DollarSign,
      description: "Total unpaid invoices",
    },
    {
      title: "Overdue",
      value: summary ? formatCurrency(summary.overdue) : "",
      icon: AlertTriangle,
      description: summary ? `${summary.overdueCount} invoice(s) overdue` : "",
    },
    {
      title: "Collected This Month",
      value: summary ? formatCurrency(summary.collectedThisMonth) : "",
      icon: Wallet,
      description: "Payments received this month",
    },
    {
      title: "Income This Month",
      value: summary ? formatCurrency(summary.incomeThisMonth) : "",
      icon: TrendingUp,
      description: "Invoiced income this month",
    },
  ];

  return (
    <div className="space-y-6" data-testid="finance-dashboard">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-finance-title">Finance Dashboard</h2>
        <p className="text-muted-foreground">Overview of your financial position</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} data-testid={`card-finance-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid={`text-finance-value-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
