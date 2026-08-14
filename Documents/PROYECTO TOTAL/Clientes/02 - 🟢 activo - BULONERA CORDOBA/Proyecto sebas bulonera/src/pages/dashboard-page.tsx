import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { DashboardCard } from "@/components/common/dashboard-card";
import { PageHeader } from "@/components/common/page-header";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { formatCommercialDateTime } from "@/features/clients/utils/formatters";
import { DASHBOARD_MODEL, ALERT_TONE_CLASS_NAMES, TONE_CLASS_NAMES, type DashboardTone } from "./dashboard-model";

function getTrendIcon(direction?: "up" | "down" | "flat"): LucideIcon {
  if (direction === "down") {
    return ArrowDownRight;
  }

  if (direction === "up") {
    return ArrowUpRight;
  }

  return ArrowRight;
}

function getToneBorderClass(tone: DashboardTone): string {
  const classes: Record<DashboardTone, string> = {
    primary: "border-slate-200/70",
    success: "border-emerald-200/70",
    warning: "border-amber-200/70",
    danger: "border-rose-200/70",
    muted: "border-border",
  };

  return classes[tone];
}

export function DashboardPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Dashboard`);

  return (
    <ContentLayout>
      <PageHeader
        title="Dashboard"
        description="Vista ejecutiva del negocio con indicadores comerciales, operativos y accesos directos."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DASHBOARD_MODEL.metrics.map((metric) => {
          const TrendIcon = getTrendIcon(metric.trendDirection);
          const card = (
            <DashboardCard
              title={metric.title}
              className={`transition-colors ${metric.to !== undefined ? "group-hover:bg-muted/30" : ""}`}
              icon={(
                <span className={`grid size-10 place-items-center rounded-full ring-1 ${TONE_CLASS_NAMES[metric.tone]}`}>
                  <metric.icon className="size-5" />
                </span>
              )}
            >
              <div className="grid gap-1">
                <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.description}</p>
                {metric.trendLabel && (
                  <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${metric.trendDirection === "down" ? "text-rose-600" : metric.trendDirection === "up" ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <TrendIcon className="size-3.5" />
                    {metric.trendLabel}
                  </p>
                )}
              </div>
            </DashboardCard>
          );

          return (
            metric.to !== undefined ? (
              <Link
                key={metric.title}
                to={metric.to}
                aria-label={`${metric.title}. ${metric.description}`}
                className="group block cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {card}
              </Link>
            ) : (
              <div key={metric.title}>{card}</div>
            )
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {DASHBOARD_MODEL.activity.map((item) => {
              const content = (
                <div className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${getToneBorderClass(item.tone)} ${item.to !== undefined ? "group-hover:bg-muted/30" : ""}`}>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ring-1 ${TONE_CLASS_NAMES[item.tone]}`}>
                    <item.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">{formatCommercialDateTime(item.date)}</span>
                </div>
              );

              return item.to !== undefined ? (
                <Link
                  key={item.id}
                  to={item.to}
                  aria-label={`${item.title}. ${item.description}`}
                  className="group block cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado operativo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {DASHBOARD_MODEL.operationalStatus.map((group) => {
              const content = (
                <div className={`rounded-lg border p-4 transition-colors ${getToneBorderClass(group.tone)} ${group.to !== undefined ? "group-hover:bg-muted/30" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`grid size-9 place-items-center rounded-full ring-1 ${TONE_CLASS_NAMES[group.tone]}`}>
                        <group.icon className="size-4" />
                      </span>
                      <div>
                        <p className="font-medium">{group.title}</p>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {group.items.map((item) => (
                      <div key={item.label} className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-xl font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );

              return group.to !== undefined ? (
                <Link
                  key={group.title}
                  to={group.to}
                  aria-label={`Abrir ${group.title}`}
                  className="group block cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {content}
                </Link>
              ) : (
                <div key={group.title}>{content}</div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {DASHBOARD_MODEL.alerts.length > 0 ? (
              DASHBOARD_MODEL.alerts.map((alert) => {
                const content = (
                  <div className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${ALERT_TONE_CLASS_NAMES[alert.tone]} ${alert.to !== undefined ? "group-hover:bg-muted/20" : ""}`}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ring-1 ${TONE_CLASS_NAMES[alert.tone]}`}>
                      <alert.icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                );

                return alert.to !== undefined ? (
                  <Link
                    key={alert.id}
                    to={alert.to}
                    aria-label={`${alert.title}. ${alert.description}`}
                    className="group block cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={alert.id}>{content}</div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No hay alertas críticas en este corte.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {DASHBOARD_MODEL.quickLinks.map((link) => (
              <Button key={link.path} asChild variant="outline" className="h-auto justify-start gap-3 px-4 py-4">
                <Link to={link.path} className="flex w-full items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <link.icon className="size-4" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block font-medium">{link.title}</span>
                    <span className="block text-xs text-muted-foreground">{link.description}</span>
                  </span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>
    </ContentLayout>
  );
}
