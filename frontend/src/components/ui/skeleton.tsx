import * as React from "react"
import { cn } from "@/lib/utils"

export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-sm bg-muted/50", className)}
            {...props}
        />
    )
}

export default Skeleton
