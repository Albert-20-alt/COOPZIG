import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-2xl border p-4 [&>svg~*]:pl-9 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default: "bg-white/80 backdrop-blur-xl border-gray-200/60 text-gray-900 shadow-sm [&>svg]:text-gray-600",
        destructive: "bg-red-50/80 backdrop-blur-xl border-red-200/60 text-red-900 shadow-sm shadow-red-900/5 [&>svg]:text-red-600",
        success: "bg-emerald-50/80 backdrop-blur-xl border-emerald-200/60 text-emerald-900 shadow-sm shadow-emerald-900/5 [&>svg]:text-emerald-600",
        warning: "bg-amber-50/80 backdrop-blur-xl border-amber-200/60 text-amber-900 shadow-sm shadow-amber-900/5 [&>svg]:text-amber-600",
        info: "bg-blue-50/80 backdrop-blur-xl border-blue-200/60 text-blue-900 shadow-sm shadow-blue-900/5 [&>svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
