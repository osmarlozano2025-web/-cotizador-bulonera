import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

interface TangoSectionCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function TangoSectionCard({ title, description, children }: TangoSectionCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
