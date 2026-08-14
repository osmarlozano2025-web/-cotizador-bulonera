import { appConfig } from "@/config/app";

export function AppFooter():React.JSX.Element { return <footer className="flex min-h-14 items-center justify-between gap-4 border-t px-4 text-xs text-muted-foreground md:px-6"><span>{appConfig.name}</span><span>Versión 0.1.0</span></footer>; }
