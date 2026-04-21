import { CheckCircle, Clock, ShieldCheck, Truck, PackageCheck, Banknote } from "lucide-react";

interface TimelineStepProps {
  title: string;
  description: string;
  status: "completed" | "current" | "pending";
  icon: React.ElementType;
}

const steps = [
  { id: 1, title: "Commande Créée", desc: "Contrat généré et signé.", icon: PackageCheck },
  { id: 2, title: "Fonds en Séquestre", desc: "Paiement acheteur bloqué et sécurisé.", icon: ShieldCheck },
  { id: 3, title: "Expédition Logistique", desc: "Marchandise en cours de transport.", icon: Truck },
  { id: 4, title: "Livraison Validée (e-POD)", desc: "Signature numérique de l'acheteur.", icon: CheckCircle },
  { id: 5, title: "Fonds Débloqués", desc: "Paiement reversé à la coopérative.", icon: Banknote }
];

export const OrderTimeline = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="py-4">
      {steps.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        
        return (
          <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {idx !== steps.length - 1 && (
              <div 
                className={`absolute left-[19px] top-10 bottom-0 w-[2px] rounded-full ${
                  isCompleted ? "bg-[#3B82F6]" : "bg-muted"
                }`} 
              />
            )}
            
            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
              isCompleted 
                ? "border-[#3B82F6] bg-[#3B82F6] text-white" 
                : isCurrent 
                  ? "border-[#3B82F6] bg-blue-50 text-[#3B82F6] ring-4 ring-blue-100" 
                  : "border-muted bg-background text-muted-foreground"
            }`}>
              <step.icon size={18} className={isCurrent ? "animate-pulse" : ""} />
            </div>
            
            <div className="flex flex-col justify-center pt-1">
              <span className={`text-sm font-bold ${
                isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.title}
              </span>
              <span className="text-xs text-muted-foreground">{step.desc}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
