import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function ContentLayout({className,...props}:HTMLAttributes<HTMLDivElement>):React.JSX.Element { return <div className={cn("space-y-6",className)} {...props}/>; }
