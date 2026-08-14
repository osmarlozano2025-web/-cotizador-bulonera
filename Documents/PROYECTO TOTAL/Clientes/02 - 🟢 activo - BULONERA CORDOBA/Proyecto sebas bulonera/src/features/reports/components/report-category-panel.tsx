import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportCategoryView, ReportSummaryBlock } from "../types";

interface ReportCategoryPanelProps {
  readonly view: ReportCategoryView;
}

function ReportBlock({ block }: { readonly block: ReportSummaryBlock }): React.JSX.Element {
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{block.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{block.description}</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {block.items.length > 0 ? (
          block.items.map((item) => (
            <div key={`${block.title}-${item.label}`} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                </div>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
              </div>
              {item.ratio !== undefined && (
                <div className="mt-3 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${item.ratio}%` }} />
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{block.emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportCategoryPanel({ view }: ReportCategoryPanelProps): React.JSX.Element {
  return (
    <section className="grid gap-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>{view.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{view.description}</p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {view.blocks.map((block) => <ReportBlock key={block.title} block={block} />)}
      </div>
    </section>
  );
}
