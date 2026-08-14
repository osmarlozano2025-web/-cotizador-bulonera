import { Boxes } from "lucide-react";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/cn";

interface BrandProps { compact?: boolean; }
export function Brand({compact=false}:BrandProps):React.JSX.Element { return <div className="flex items-center gap-3 overflow-hidden"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Boxes className="size-5"/></span><div className={cn("min-w-0 whitespace-nowrap",compact&&"hidden")}><p className="truncate text-sm font-semibold leading-none">{appConfig.name}</p><p className="mt-1 text-xs text-muted-foreground">Plataforma comercial</p></div></div>; }
