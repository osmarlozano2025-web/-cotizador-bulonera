import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly icon?: ReactNode;
  readonly className?: string;
}

export function DashboardCard({ title, children, icon, className }: DashboardCardProps): React.JSX.Element {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
