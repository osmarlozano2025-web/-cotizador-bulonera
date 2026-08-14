import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/common/dashboard-card";
import type { ReactNode } from "react";
import type { ReportMetricCard } from "../types";

const TONE_CLASS_NAMES: Record<ReportMetricCard["tone"], string> = {
  primary: "bg-slate-100 text-slate-700 ring-slate-200/80 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-slate-800",
  success: "bg-emerald-100 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900",
  warning: "bg-amber-100 text-amber-700 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900",
  danger: "bg-rose-100 text-rose-700 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900",
  muted: "bg-muted text-muted-foreground ring-border",
};

interface ReportMetricGridProps {
  readonly metrics: readonly ReportMetricCard[];
}

export function ReportMetricGrid({ metrics }: ReportMetricGridProps): React.JSX.Element {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <DashboardCard
          key={metric.title}
          title={metric.title}
          className="transition-colors"
          icon={(
            <span className={`grid size-10 place-items-center rounded-full ring-1 ${TONE_CLASS_NAMES[metric.tone]}`}>
              <metric.icon className="size-5" />
            </span>
          )}
        >
          <div className="grid gap-1">
            <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
            <p className="text-sm text-muted-foreground">{metric.description}</p>
            {metric.note && <p className="text-xs font-medium text-muted-foreground">{metric.note}</p>}
          </div>
        </DashboardCard>
      ))}
    </section>
  );
}

interface SectionCardProps {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

export function ReportSectionCard({ title, description, children }: SectionCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
