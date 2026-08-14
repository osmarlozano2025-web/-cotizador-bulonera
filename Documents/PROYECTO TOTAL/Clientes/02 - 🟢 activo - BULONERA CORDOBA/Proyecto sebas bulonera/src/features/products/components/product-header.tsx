import type { ReactNode } from "react";
import { PageHeader } from "@/components/common/page-header";

export function ProductHeader({
  title,
  description,
  actions,
}: {
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}): React.JSX.Element {
  return <PageHeader title={title} {...(description !== undefined ? { description } : {})} actions={actions} />;
}

