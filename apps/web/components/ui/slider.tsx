import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Minimal range slider built on the native input — no extra dependency.
 * Used for adjusting portion size on the review step.
 */
const Slider = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="range"
    className={cn(
      "h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      className,
    )}
    {...props}
  />
));
Slider.displayName = "Slider";

export { Slider };
