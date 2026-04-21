import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const handleConfirm = () => {
    state.onConfirm();
    handleClose();
  };

  const variantStyles = {
    danger: {
      icon: <Trash2 className="text-white" size={22} />,
      iconBg: "bg-red-500",
      glow: "from-red-500/20 to-red-600/5",
      btn: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20",
    },
    warning: {
      icon: <AlertTriangle className="text-white" size={22} />,
      iconBg: "bg-amber-500",
      glow: "from-amber-500/20 to-amber-600/5",
      btn: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20",
    },
    info: {
      icon: <AlertTriangle className="text-white" size={22} />,
      iconBg: "bg-blue-500",
      glow: "from-blue-500/20 to-blue-600/5",
      btn: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
    },
  };

  const v = variantStyles[state.variant || "danger"];

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm p-0 rounded-2xl border border-black/[0.06] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.25)] bg-white overflow-hidden">
        {/* Top gradient glow strip */}
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${v.glow} pointer-events-none`} />
        
        <div className="relative p-7">
          {/* Close X */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${v.iconBg} flex items-center justify-center mb-5 shadow-lg`}>
            {v.icon}
          </div>

          {/* Text */}
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{state.title}</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{state.description}</p>

          {/* Buttons */}
          <div className="flex gap-3 mt-7">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
              onClick={handleClose}
            >
              {state.cancelLabel}
            </Button>
            <Button
              className={`flex-1 h-11 rounded-xl font-semibold ${v.btn}`}
              onClick={handleConfirm}
            >
              {state.confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
