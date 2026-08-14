import { Box } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps { title?:string; description?:string; icon?:ReactNode; }
export function EmptyState({title="Espacio reservado",description="El contenido de este módulo se incorporará en una etapa posterior.",icon=<Box className="size-5"/>}:EmptyStateProps):React.JSX.Element { return <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-card/50 p-8 text-center"><div><span className="mx-auto grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</span><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p></div></div>; }
