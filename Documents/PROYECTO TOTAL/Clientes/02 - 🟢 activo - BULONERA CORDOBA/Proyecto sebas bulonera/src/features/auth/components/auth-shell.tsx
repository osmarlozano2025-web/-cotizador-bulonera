import type { ReactNode } from "react";
import { Brand } from "@/components/common/brand";

export function AuthShell({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Brand />
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {children}
        </div>
        {import.meta.env.DEV && (
          <p className="text-center text-xs text-muted-foreground">Modo desarrollo</p>
        )}
      </div>
    </div>
  );
}
