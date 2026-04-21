import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, User, Building2, Phone, MapPin, Package, FileText, CheckCircle, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { logEvent } from "@/utils/analytics";

const casamanceProducts = [
  "Mangue Kent", "Mangue Keitt", "Mangue Diorou", "Anacarde (Noix de cajou)", 
  "Riz de Casamance", "Huile de Palme", "Miel de Mangrove", "Ditakh", "Madd", 
  "Bouye (Pain de singe)", "Banane Plantain", "Banane Douce", "Agrumes", 
  "Mangue Séchée", "Papaye", "Arachide", "Maïs"
];

const OrderSection = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState<any>({
    nom_complet: "", entreprise: "", email: "", telephone: "", localisation: "", message: "",
    lignes: [{ id: Date.now(), produit: "", quantite: "" }]
  });

  const { data: configs } = useSiteConfig();
  const { i18n } = useTranslation();

  const getConfig = (key: string, fallback: string) => {
    const configVal = configs?.find(c => c.cle === key)?.valeur;
    const nonTranslatableKeys = ["contact_phone"];
    // If not in French, use the translated fallback for text fields
    if (i18n.language && !i18n.language.startsWith("fr") && !nonTranslatableKeys.includes(key)) {
      return fallback;
    }
    return configVal || fallback;
  };

  const contactPhone = getConfig("contact_phone", t("landing.order.contact_desc", "+221 33 XXX XX XX"));
  const minOrderQty = getConfig("order_min_quantity", t("landing.order.min_qty_desc", "À partir de 1 tonne"));
  const responseTime = getConfig("order_response_time", t("landing.order.response_desc", "Sous 48 heures ouvrées"));

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_complet || !form.email || !form.telephone || form.lignes.some((l:any) => !l.produit || !l.quantite)) {
      toast.error(t("landing.order.error_fields", "Veuillez remplir tous les champs obligatoires"));
      return;
    }
    setLoading(true);
    const inserts = form.lignes.map((ligne: any) => ({
      nom_complet: form.nom_complet, entreprise: form.entreprise || null, email: form.email,
      telephone: form.telephone, localisation: form.localisation || null, 
      produit: ligne.produit,
      quantite: parseFloat(ligne.quantite), message: form.message || null,
    }));
    
    const { error } = await supabase.from("demandes").insert(inserts);
    setLoading(false);
    if (error) { toast.error(t("landing.order.error_send", "Erreur lors de l'envoi. Veuillez réessayer.")); return; }
    
    logEvent("Conversion", "Submit_Order", form.lignes.map((l:any)=>l.produit).join(","));
    toast.success(t("landing.order.success", "Votre demande a été envoyée avec succès !"));
    setForm({ nom_complet: "", entreprise: "", email: "", telephone: "", localisation: "", message: "", lignes: [{ id: Date.now(), produit: "", quantite: "" }] });
    setIsSuccess(true);
  };

  const inputCls = "w-full px-4 py-3.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-300 text-sm";

  return (
    <section id="commander" className="py-16 sm:py-28 bg-card relative overflow-hidden">
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-primary/[0.03] blur-[120px]" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative">
        <div className="grid lg:grid-cols-5 gap-8 sm:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary/[0.08] text-secondary text-xs font-semibold tracking-[0.15em] uppercase mb-6">
              {t("landing.order.badge", "Passez Commande")}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
              {t("landing.order.title", "Intéressé par nos produits ?")}
            </h2>
            <p className="text-muted-foreground mt-6 text-lg leading-relaxed font-light">
              {t("landing.order.subtitle", "Remplissez ce formulaire et notre équipe commerciale vous recontactera sous 48 heures avec une offre personnalisée.")}
            </p>

            <div className="mt-10 space-y-4">
              {[
                { icon: Package, title: t("landing.order.min_qty", "Quantité minimum"), desc: minOrderQty, color: "primary" },
                { icon: Phone, title: t("landing.order.contact", "Contact direct"), desc: contactPhone, color: "secondary" },
                { icon: CheckCircle, title: t("landing.order.response", "Réponse garantie"), desc: responseTime, color: "success" },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-4 p-5 rounded-2xl bg-background border border-border hover:shadow-card transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-${item.color}/8 flex items-center justify-center`}>
                    <item.icon size={20} className={`text-${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-3"
          >
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-background rounded-3xl border border-border shadow-elevated p-8 md:p-12 text-center flex flex-col items-center justify-center h-full min-h-[450px]"
              >
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 relative">
                   <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                   <CheckCircle size={48} className="text-emerald-500 relative z-10" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight text-foreground">
                   {t("landing.order.success_title", "Demande envoyée avec succès !")}
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-10 max-w-sm mx-auto leading-relaxed">
                   {t("landing.order.success_desc", "Merci de votre intérêt. Notre équipe a bien reçu votre demande et vous recontactera sous 48 heures ouvrées.")}
                </p>
                <button
                   onClick={() => setIsSuccess(false)}
                   className="px-6 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-secondary/5 hover:text-secondary transition-colors"
                >
                   {t("landing.order.success_close", "Nouvelle demande")}
                </button>
              </motion.div>
            ) : (
            <form onSubmit={handleSubmit} className="bg-background rounded-3xl border border-border shadow-elevated p-8 md:p-10">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <User size={12} /> {t("landing.order.form_name", "Nom complet *")}
                  </label>
                  <input type="text" value={form.nom_complet} onChange={(e) => update("nom_complet", e.target.value)} placeholder="Votre nom" className={inputCls} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Building2 size={12} /> {t("landing.order.form_company", "Entreprise")}
                  </label>
                  <input type="text" value={form.entreprise} onChange={(e) => update("entreprise", e.target.value)} placeholder="Nom de votre structure" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    📧 {t("landing.order.form_email", "Email *")}
                  </label>
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="votre@email.com" className={inputCls} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Phone size={12} /> {t("landing.order.form_phone", "Téléphone *")}
                  </label>
                  <input type="tel" value={form.telephone} onChange={(e) => update("telephone", e.target.value)} placeholder="+221 7X XXX XX XX" className={inputCls} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin size={12} /> {t("landing.order.form_loc", "Localisation")}
                  </label>
                  <input type="text" value={form.localisation} onChange={(e) => update("localisation", e.target.value)} placeholder="Ville, Pays" className={inputCls} />
                </div>
                <div className="sm:col-span-2 space-y-4 pt-2">
                  <datalist id="casamance-products">
                    {casamanceProducts.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                       <Package size={12} /> Produits souhaités
                     </label>
                     <button
                        type="button"
                        onClick={() => setForm({...form, lignes: [...form.lignes, { id: Date.now(), produit: "", quantite: "" }]})}
                        className="text-xs font-bold text-primary hover:text-primary/80"
                     >
                        + Ajouter un autre
                     </button>
                  </div>
                  
                  {form.lignes.map((ligne: any, index: number) => (
                    <div key={ligne.id} className="flex gap-3 relative pb-2 group">
                      {form.lignes.length > 1 && (
                         <button 
                            type="button"
                            onClick={() => setForm({...form, lignes: form.lignes.filter((_:any, i:number) => i !== index)})}
                            className="absolute -left-3 top-[-8px] text-xs font-bold w-5 h-5 rounded-full bg-rose-100 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                         >✕</button>
                      )}
                      <div className="flex-1">
                        <input 
                           type="text"
                           list="casamance-products"
                           value={ligne.produit} 
                           onChange={(e) => {
                             const l = [...form.lignes];
                             l[index].produit = e.target.value;
                             setForm({...form, lignes: l});
                           }} 
                           placeholder={t("landing.order.form_product_placeholder", "Choisir ou taper un produit...")}
                           className={inputCls} required
                        />
                      </div>
                      <div className="w-1/3">
                        <input 
                           type="number" 
                           value={ligne.quantite} 
                           onChange={(e) => {
                             const l = [...form.lignes];
                             l[index].quantite = e.target.value;
                             setForm({...form, lignes: l});
                           }} 
                           placeholder={t("landing.order.form_qty", "Qté (T)")} 
                           min="1" className={inputCls} required 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileText size={12} /> {t("landing.order.form_msg", "Message")}
                </label>
                <textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Précisez vos besoins..." rows={3} className={`${inputCls} resize-none`} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group mt-8 w-full py-4 rounded-2xl bg-gradient-hero text-primary-foreground font-bold text-base hover:shadow-premium transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-60"
              >
                <Send size={18} />
                {loading ? t("landing.order.form_loading", "Envoi en cours...") : t("landing.order.form_submit", "Envoyer ma Demande")}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OrderSection;
