import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-950 group-[.toaster]:border-slate-200/60 group-[.toaster]:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group-[.toaster]:rounded-2xl font-sans",
          description: "group-[.toast]:text-slate-500 text-xs font-medium",
          title: "group-[.toast]:text-slate-900 text-sm font-bold",
          actionButton:
            "group-[.toast]:bg-slate-900 group-[.toast]:text-slate-50 group-[.toast]:font-semibold group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:py-2",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 group-[.toast]:font-semibold group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:py-2",
          success: "group-[.toaster]:bg-emerald-50/90 group-[.toaster]:border-emerald-100 group-[.toaster]:text-emerald-900 [&>div>svg]:text-emerald-600 backdrop-blur-xl",
          error: "group-[.toaster]:bg-rose-50/90 group-[.toaster]:border-rose-100 group-[.toaster]:text-rose-900 [&>div>svg]:text-rose-600 backdrop-blur-xl",
          warning: "group-[.toaster]:bg-amber-50/90 group-[.toaster]:border-amber-100 group-[.toaster]:text-amber-900 [&>div>svg]:text-amber-600 backdrop-blur-xl",
          info: "group-[.toaster]:bg-blue-50/90 group-[.toaster]:border-blue-100 group-[.toaster]:text-blue-900 [&>div>svg]:text-blue-600 backdrop-blur-xl",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
