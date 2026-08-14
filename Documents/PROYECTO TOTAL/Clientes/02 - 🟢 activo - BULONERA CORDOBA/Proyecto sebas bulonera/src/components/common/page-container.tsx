import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function PageContainer({className,...props}:HTMLAttributes<HTMLDivElement>):React.JSX.Element { return <div className={cn("mx-auto w-full max-w-[1600px]",className)} {...props}/>; }
