import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[hsl(215_20%_40%)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(199_100%_50%/0.5)] focus-visible:border-[hsl(199_100%_50%/0.5)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          "bg-[hsl(220_36%_11%)] border-[hsl(220_32%_18%)] hover:border-[hsl(220_32%_22%)] text-[hsl(210_40%_92%)]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
