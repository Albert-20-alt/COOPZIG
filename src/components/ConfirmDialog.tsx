import { useState, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
}

let externalSetState: ((s: ConfirmState) => void) | null = null;

export function useConfirm() {
  const confirm = useCallback((opts: ConfirmOptions & { onConfirm: () => void }) => {
    if (externalSetState) {
      externalSetState({
        open: true,
        title: opts.title || "Confirmation",
        description: opts.description || "Êtes-vous sûr de vouloir effectuer cette action ?",
        confirmLabel: opts.confirmLabel || "Confirmer",
        cancelLabel: opts.cancelLabel || "Annuler",
        variant: opts.variant || "danger",
        onConfirm: opts.onConfirm,
      });
    }
  }, []);
  return confirm;
}

export function ConfirmDialog() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirmer",
    cancelLabel: "Annuler",
    variant: "danger",
    onConfirm: () => {},
  });

  externalSetState = setState;

  const handleClose = () => setState((s) => ({ ...s, open: false }));
  const handleConfirm = () => { state.onConfirm(); handleClose(); };

  const variantStyles = {
    danger: {
      icon: <Trash2 className="text-white" size={22} />,
      iconBg: "bg-red-500",
      glow: "from-red-500/15 to-transparent",
      btn: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      icon: <AlertTriangle className="text-white" size={22} />,
      iconBg: "bg-amber-500",
      glow: "from-amber-500/15 to-transparent",
      btn: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    info: {
      icon: <AlertTriangle className="text-white" size={22} />,
      iconBg: "bg-blue-500",
      glow: "from-blue-500/15 to-transparent",
      btn: "bg-blue-600 hover:bg-blue-700 text-white",
    },
  };

  const v = variantStyles[state.variant || "danger"];

  return (
    <DialogPrimitive.Root open={state.open} onOpenChange={(o) => !o && handleClose()}>
      <DialogPortal>
        <DialogOverlay />
        {/* Use raw Radix Content to avoid the built-in close button */}
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="relative bg-white dark:bg-[#111827] rounded-2xl shadow-[0_32px_80px_-8px_rgba(0,0,0,0.28)] overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
            {/* Top gradient */}
            <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${v.glow} pointer-events-none`} />

            <div className="relative p-7">
              {/* Close button — plain, no focus ring */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors outline-none"
              >
                <X size={15} />
              </button>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${v.iconBg} flex items-center justify-center mb-5 shadow-lg`}>
                {v.icon}
              </div>

              {/* Text */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug">{state.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{state.description}</p>

              {/* Buttons */}
              <div className="flex gap-3 mt-7">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-white/5 outline-none focus-visible:outline-none"
                  onClick={handleClose}
                >
                  {state.cancelLabel}
                </Button>
                <Button
                  className={`flex-1 h-11 rounded-xl font-semibold outline-none focus-visible:outline-none ${v.btn}`}
                  onClick={handleConfirm}
                >
                  {state.confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
