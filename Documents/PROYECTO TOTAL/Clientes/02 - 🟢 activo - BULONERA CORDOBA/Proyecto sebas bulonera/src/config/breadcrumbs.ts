import { ROUTE_LABELS } from "./navigation";

export interface BreadcrumbItem {
  readonly label: string;
  readonly path: string;
  readonly current: boolean;
}

export function buildBreadcrumbItems(pathname: string): readonly BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return [];
  }

  if (segments[0] === "dashboard") {
    return [];
  }

  function getLabel(segment: string, isLast: boolean): string {
    if (segment === "new") {
      return "Nuevo";
    }

    if (segment === "edit") {
      return "Editar";
    }

    if (segment === "integrations") {
      return "Integraciones";
    }

    if (isLast) {
      return "Detalle";
    }

    return ROUTE_LABELS[segment] ?? segment;
  }

  const rootSegment = segments[0] ?? "";
  const items: BreadcrumbItem[] = [
    {
      label: getLabel(rootSegment, false),
      path: `/${rootSegment}`,
      current: segments.length === 1,
    },
  ];

  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isLast = index === segments.length - 1;
    const path = `/${segments.slice(0, index + 1).join("/")}`;

    items.push({
      label: getLabel(segment, isLast),
      path,
      current: isLast,
    });
  }

  return items;
}
