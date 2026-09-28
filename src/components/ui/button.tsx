import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium tracking-[0.005em] transition-[background-color,border-color,color,box-shadow,filter] duration-200 ease-out active:brightness-95 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "chamfer bg-primary text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.14)] hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground/70",
        destructive:
          "chamfer bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-destructive-foreground/70",
        outline:
          "brackets border border-foreground/[0.14] bg-transparent text-foreground hover:border-foreground/25 hover:bg-foreground/[0.03] focus-visible:border-primary/60",
        secondary:
          "border border-border bg-muted text-foreground hover:bg-accent hover:border-foreground/20 focus-visible:border-primary/60",
        ghost: "text-foreground hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.05]",
        link: "text-primary underline-offset-4 hover:underline",
        command: "btn-primary-premium",
        glass: "btn-liquid-glass focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground/70",
        "glass-neutral": "btn-liquid-glass btn-liquid-glass-neutral focus-visible:ring-1 focus-visible:ring-primary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-[13px] [--chamfer:8px]",
        lg: "h-11 px-7 [--chamfer:12px]",
        icon: "h-10 w-10 [--chamfer:8px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
