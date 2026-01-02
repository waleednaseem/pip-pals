import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/80 text-primary-foreground shadow-[0_2px_8px_hsl(195_100%_50%/0.3)] hover:bg-primary/90",
        secondary: "border-border/30 bg-secondary/70 text-secondary-foreground shadow-[0_2px_8px_hsl(220_50%_5%/0.2)] hover:bg-secondary/80",
        destructive: "border-destructive/30 bg-destructive/80 text-destructive-foreground shadow-[0_2px_8px_hsl(0_85%_60%/0.3)] hover:bg-destructive/90",
        outline: "text-foreground bg-background/30 border-border/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
