import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, MessageSquare, User, AtSign, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/utils/analytics";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const Contact = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: configs } = useSiteConfig();
  const cfg = (key: string, fallback: string) =>
    configs?.find((c) => c.cle === key)?.valeur || fallback;

  const heroTitle    = cfg("contact_hero_title",    t("contact.hero.title", "Parlons ensemble"));
  const heroSubtitle = cfg("contact_hero_subtitle", t("contact.hero.subtitle", "Une question sur nos produits, un partenariat ou la coopérative ? Notre équipe vous répond dans les plus brefs délais."));
  const address      = cfg("contact_address", "Ziguinchor, Casamance, Sénégal");
  const phone        = cfg("contact_phone",   "+221 33 991 XX XX");
  const emailVal     = cfg("contact_email",   "contact@crpaz-casamance.sn");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData    = new FormData(e.currentTarget);
    const nom_complet = formData.get("nom_complet") as string;
    const email       = formData.get("email") as string;
    const sujet       = formData.get("sujet") as string;
    const message     = formData.get("message") as string;

    try {
      const { error } = await (supabase as any)
        .from("contact_messages")
        .insert([{ nom_complet, email, sujet, message, statut: "Nouvelle" }]);
      if (error) throw error;
      logEvent("Conversion", "Submit_Contact", sujet);
      setSubmitted(true);
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error(t("contact.form.error_toast", "Une erreur est survenue. Veuillez réessayer."));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (window.location.hash === "#formulaire-demande") {
      setTimeout(() => {
        const el = document.getElementById("formulaire-demande");
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 300);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#071410] pt-28 sm:pt-36 pb-16 sm:pb-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-emerald-900/[0.15] rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 text-[14vw] font-black text-white/[0.025] leading-none select-none pointer-events-none tracking-tighter">
          CONTACT
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 sm:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.15] bg-white/5 text-white/50 text-[10px] font-semibold uppercase tracking-[0.3em] mb-7">
              {t("contact.hero.badge", "Écrivez-nous")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight text-white mb-5 sm:mb-7">
              {heroTitle}
            </h1>
            <p className="text-lg text-white/[0.45] font-light leading-relaxed max-w-xl">
              {heroSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-5 gap-12 lg:gap-16">

          {/* Left: contact info ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div {...fadeUp}>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-4">
                {t("contact.info.eyebrow", "Informations")}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-8">
                {t("contact.info.title", "Nous trouver")}
              </h2>
            </motion.div>

            {/* Contact cards */}
            {[
              {
                icon: MapPin,
                title: t("contact.info.hq", "Notre Siège"),
                detail: address,
                sub: t("contact.info.hq_desc", "Venez nous rencontrer au cœur de la région de production."),
              },
              {
                icon: Phone,
                title: t("contact.info.phone", "Téléphone"),
                detail: phone,
                sub: t("contact.info.phone_desc", "Du lundi au vendredi, de 8h à 18h."),
              },
              {
                icon: Mail,
                title: t("contact.info.email", "Email"),
                detail: emailVal,
                sub: t("contact.info.email_desc", "Réponse sous 24 heures ouvrées."),
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group flex items-start gap-5 p-6 rounded-3xl border border-black/[0.05] bg-white hover:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.06)] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/[0.08] border border-primary/[0.15] flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <item.icon size={18} className="text-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">{item.title}</p>
                  <p className="font-semibold text-gray-900 mb-1">{item.detail}</p>
                  <p className="text-sm text-muted-foreground font-light">{item.sub}</p>
                </div>
              </motion.div>
            ))}

            {/* Map placeholder */}
            <motion.div
              {...fadeUp}
              className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-black/[0.05] bg-gradient-to-br from-[#071410] to-[#0d2416] flex items-center justify-center"
            >
              {/* Decorative map dots */}
              <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary/30"
                    style={{ top: `${15 + (i * 37) % 70}%`, left: `${10 + (i * 53) % 80}%` }}
                  />
                ))}
                {/* "Roads" */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5" />
                <div className="absolute top-1/3 left-1/4 right-1/4 h-px bg-white/5 rotate-12" />
              </div>
              {/* Pin */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(27,77,33,0.6)]">
                  <MapPin size={22} className="text-white" />
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/[0.15] px-4 py-2 rounded-full">
                  <span className="text-xs font-semibold text-white/80">{t("contact.info.senegal", "Ziguinchor, Sénégal")}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: form ──────────────────────────────────────────────────────── */}
          <div className="lg:col-span-3" id="formulaire-demande">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="bg-white rounded-[2rem] border border-black/[0.05] p-10 md:p-12 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.06)]"
            >
              {submitted ? (
                /* Success state */
                <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 size={40} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">{t("contact.form.success_title", "Message envoyé !")}</h3>
                    <p className="text-muted-foreground font-light leading-relaxed max-w-sm">
                      {t("contact.form.success_desc", "Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.")}
                    </p>
                  </div>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-7 py-3 rounded-2xl border border-black/10 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("contact.form.success_button", "Envoyer un autre message")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-10">
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] block mb-3">
                      {t("contact.form.eyebrow", "Formulaire")}
                    </span>
                    <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
                      {t("contact.form.title", "Envoyez-nous un message")}
                    </h2>
                    <p className="text-muted-foreground font-light mt-2 text-sm">
                      {t("contact.form.desc", "Remplissez ce formulaire et nous vous répondrons au plus vite.")}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-5">
                      {/* Nom */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">{t("contact.form.name_label", "Nom complet")}</label>
                        <div className="relative">
                          <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                          <Input
                            name="nom_complet"
                            placeholder={t("contact.form.name_placeholder", "Jean Mendy")}
                            className="pl-11 h-12 rounded-2xl border-black/[0.07] bg-[#FAFAF9] focus:bg-white text-sm transition-colors"
                            required
                          />
                        </div>
                      </div>
                      {/* Email */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">{t("contact.form.email_label", "Email")}</label>
                        <div className="relative">
                          <AtSign size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                          <Input
                            name="email"
                            type="email"
                            placeholder={t("contact.form.email_placeholder", "jean@example.com")}
                            className="pl-11 h-12 rounded-2xl border-black/[0.07] bg-[#FAFAF9] focus:bg-white text-sm transition-colors"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sujet */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">{t("contact.form.subject_label", "Sujet")}</label>
                      <div className="relative">
                        <MessageSquare size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <Input
                          name="sujet"
                          placeholder={t("contact.form.subject_placeholder", "Ex : Informations sur les récoltes de mangue")}
                          className="pl-11 h-12 rounded-2xl border-black/[0.07] bg-[#FAFAF9] focus:bg-white text-sm transition-colors"
                          required
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">{t("contact.form.message_label", "Message")}</label>
                      <Textarea
                        name="message"
                        placeholder={t("contact.form.message_placeholder", "Détaillez votre besoin, votre projet ou votre question ici...")}
                        className="min-h-[160px] p-4 rounded-2xl border-black/[0.07] bg-[#FAFAF9] focus:bg-white resize-none text-sm transition-colors"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group w-full h-14 rounded-2xl bg-[#071410] text-white font-bold text-sm flex items-center justify-center gap-3 hover:bg-primary hover:shadow-[0_0_30px_rgba(27,77,33,0.4)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? t("contact.form.button_sending", "Envoi en cours…") : t("contact.form.button_idle", "Envoyer le message")}
                      {isSubmitting
                        ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        : <ArrowUpRight size={17} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      }
                    </button>

                    <p className="text-center text-[11px] text-gray-400 font-medium">
                      {t("contact.form.disclaimer", "Vos données sont protégées et ne seront utilisées que pour répondre à votre demande.")}
                    </p>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Quick contact band ───────────────────────────────────────────────── */}
      <section className="py-16 bg-[#071410] relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-primary/[0.08] rounded-full blur-[80px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-white font-semibold text-lg mb-1">{t("contact.quick.title", "Besoin d'une réponse rapide ?")}</p>
            <p className="text-white/40 text-sm font-light">{t("contact.quick.desc", "Appelez-nous directement ou connectez-vous à l'espace membre.")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white/[0.06] border border-white/10 text-white font-semibold text-sm hover:bg-white/10 transition-all"
            >
              <Phone size={15} />
              {phone}
            </a>
            <a
              href={`mailto:${emailVal}`}
              className="group flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-primary text-white font-semibold text-sm hover:shadow-[0_0_25px_rgba(27,77,33,0.5)] hover:scale-[1.02] transition-all duration-300"
            >
              <Send size={15} />
              {t("contact.quick.email_button", "Envoyer un email")}
              <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
