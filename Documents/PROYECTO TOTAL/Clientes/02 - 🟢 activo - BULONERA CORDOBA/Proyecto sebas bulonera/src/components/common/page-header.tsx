import type { ReactNode } from "react";

interface PageHeaderProps { title: string; description?: string; actions?: ReactNode; }
export function PageHeader({title,description,actions}:PageHeaderProps):React.JSX.Element { return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{description&&<p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{actions&&<div className="flex shrink-0 items-center gap-2">{actions}</div>}</div>; }
