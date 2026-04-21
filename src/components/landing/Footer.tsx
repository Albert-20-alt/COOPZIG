import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, ArrowUpRight, Facebook, Instagram, Linkedin, Twitter, ArrowUp, Send, ShieldCheck, Leaf, Globe, Sparkles } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import Logo from "@/components/brand/Logo";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const { t } = useTranslation();
  const { data: configs } = useSiteConfig();
  const [emailValue, setEmailValue] = useState("");

  const { i18n } = useTranslation();
  const getConfig = (key: string, fallback: string) => {
    const configVal = configs?.find(c => c.cle === key)?.valeur;
    const nonTranslatableKeys = ["logo_url", "contact_phone", "contact_email"];
    if (i18n.language && !i18n.language.startsWith("fr") && !nonTranslatableKeys.includes(key)) {
      return fallback;
    }
    return configVal || fallback;
  };

  const siteName = getConfig("site_name", "CRPAZ");
  const siteSubtitle = getConfig("site_subtitle", t("landing.footer.site_subtitle", "Coopérative de Ziguinchor"));
  const footerDesc = getConfig("footer_description", t("landing.footer.footer_desc", "Coopérative Régionale des Planteurs & Agriculteurs de Ziguinchor. Rejoignez notre mouvement pour une excellence agricole en Casamance."));
  const address = getConfig("contact_address", "Ziguinchor, Casamance, Sénégal");
  const phone = getConfig("contact_phone", "+221 33 991 XX XX");
  const email = getConfig("contact_email", "contact@crpaz-casamance.sn");
  const logoUrl = getConfig("logo_url", "");
  
  const ctaBadge = getConfig("footer_cta_badge", t("landing.footer.cta_badge", "L'Excellence Agricole de Ziguinchor"));
  const ctaTitle = getConfig("footer_cta_title", t("landing.footer.cta_title", "Prêt à transformer l'agriculture avec nous ?"));
  const ctaBtn1 = getConfig("footer_cta_btn1", t("landing.footer.cta_btn1", "Passer une commande"));
  const ctaBtn2 = getConfig("footer_cta_btn2", t("landing.footer.cta_btn2", "Devenir membre"));
  
  const socialLinks = [
    { icon: Facebook, href: getConfig("social_facebook", "#"), label: "Facebook" },
    { icon: Instagram, href: getConfig("social_instagram", "#"), label: "Instagram" },
    { icon: Linkedin, href: getConfig("social_linkedin", "#"), label: "LinkedIn" },
    { icon: Twitter, href: getConfig("social_twitter", "#"), label: "Twitter" },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValue) return;
    setNewsletterLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("newsletter_subscriptions")
        .insert({ email: emailValue });
      if (error) {
        // Duplicate email — already subscribed
        if (error.code === "23505") {
          toast.info(t("landing.footer.newsletter_duplicate", "Vous êtes déjà inscrit à notre newsletter."));
        } else {
          throw error;
        }
      } else {
        toast.success(t("landing.footer.newsletter_success", "Merci ! Vous êtes inscrit à notre newsletter."));
      }
      setEmailValue("");
    } catch {
      toast.error(t("landing.footer.newsletter_error", "Une erreur est survenue. Veuillez réessayer."));
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <footer className="relative bg-[#051109] text-white/70 overflow-hidden font-sans border-t border-white/5">
      {/* Visual Accents & Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[140px] opacity-15 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none" />

      {/* Pre-Footer Hero CTA */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-32 pb-24 relative z-10">
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
       className="relative p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] bg-gradient-to-br from-white/[0.07] to-transparent border border-white/20 backdrop-blur-3xl overflow-hidden text-center mb-16 sm:mb-24 md:mb-32 shadow-2xl"
        >
            <Logo size={240} variant="white" imageUrl={logoUrl} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 grayscale brightness-200 pointer-events-none rotate-12 scale-150" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-[10px] font-semibold uppercase tracking-[0.25em] mb-10 border border-primary/20 shadow-glow-sm">
              <Sparkles size={12} /> {ctaBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold mb-6 sm:mb-10 leading-[1.05] tracking-tight text-white whitespace-pre-line">
              {ctaTitle.replace(/<br\s*\/?>/g, '\n')}
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-14">
              <a 
                href="#commander" 
                className="group w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-6 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:shadow-glow hover:scale-105 transition-all duration-500 text-base sm:text-lg"
              >
                {ctaBtn1}
                <ArrowUpRight size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </a>
              <button className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-6 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 rounded-2xl font-bold transition-all duration-500 backdrop-blur-md text-base sm:text-lg">
                {ctaBtn2}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-x-12 lg:gap-x-24">
          <div className="md:col-span-4 space-y-10">
            <div className="flex items-center gap-5">
              <Logo size={72} variant="premium" imageUrl={logoUrl} />
              <div>
                <span className="text-4xl font-semibold text-white block tracking-tight leading-none mb-1">{siteName}</span>
                <span className="text-[11px] tracking-[0.4em] uppercase text-primary font-semibold opacity-90">{siteSubtitle}</span>
              </div>
            </div>
            
            <p className="text-lg leading-relaxed font-light text-white/50 max-w-sm">
              {footerDesc}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { icon: ShieldCheck, label: t("landing.footer.badge1", "Certifié Qualité") },
                { icon: Leaf, label: t("landing.footer.badge2", "Bio Casamance") },
                { icon: Globe, label: t("landing.footer.badge3", "Export Direct") }
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/90">
                  <badge.icon size={12} className="text-primary/60" />
                  {badge.label}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-4">
              {socialLinks.map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-all duration-500 group"
                >
                  <social.icon size={20} className="text-white group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 space-y-8">
            <h4 className="font-semibold text-white text-xs uppercase tracking-[0.3em] mb-10 relative">
              {t("landing.footer.navigation", "Navigation")}
              <span className="absolute -bottom-3 left-0 w-8 h-0.5 bg-primary rounded-full" />
            </h4>
            <div className="flex flex-col gap-5 text-sm font-medium">
              {[
                { label: t("landing.footer.nav_about", "Qui sommes-nous"),  href: "/qui-sommes-nous" },
                { label: t("landing.footer.nav_markets", "Prix du marché"),   href: "/prix" },
                { label: t("landing.footer.nav_projects", "Projets"),          href: "/projets" },
                { label: t("landing.footer.nav_news", "Actualités"),       href: "/blog" },
                { label: t("landing.footer.contact", "Contact"),          href: "/contact" },
              ].map((link) => (
                <Link key={link.href} to={link.href} className="hover:text-primary transition-colors duration-300 flex items-center gap-2 group whitespace-nowrap">
                  {link.label}
                  <ArrowUpRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 space-y-8">
            <h4 className="font-semibold text-white text-xs uppercase tracking-[0.3em] mb-10 relative">
              {t("landing.footer.contact", "Contact Us")}
              <span className="absolute -bottom-3 left-0 w-8 h-0.5 bg-secondary rounded-full" />
            </h4>
            <div className="space-y-6">
              {[
                { icon: MapPin, text: address, color: "text-primary" },
                { icon: Phone, text: phone, color: "text-secondary" },
                { icon: Mail, text: email, color: "text-primary" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
                    <item.icon size={16} className={item.color} />
                  </div>
                  <span className="text-sm font-light leading-relaxed pt-1.5 group-hover:text-white transition-colors">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 space-y-8">
            <h4 className="font-semibold text-white text-xs uppercase tracking-[0.3em] mb-10 relative">
              {t("landing.footer.newsletter", "Newsletter")}
              <span className="absolute -bottom-3 left-0 w-8 h-0.5 bg-white/40 rounded-full" />
            </h4>
            <div className="space-y-6">
               <p className="text-sm font-light text-white/90 leading-relaxed">
                 {t("landing.footer.newsletter_desc", "Inscrivez-vous pour recevoir les dernières mises à jour sur nos récoltes et nos prix.")}
               </p>
               <form onSubmit={handleNewsletter} className="relative">
                  <input 
                    type="email" 
                    placeholder={t("landing.footer.email_placeholder", "Votre email")}
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    disabled={newsletterLoading}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all pr-14 placeholder:text-white/70 disabled:opacity-60"
                  />
                  <button 
                    type="submit" 
                    disabled={newsletterLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center hover:shadow-glow transition-all active:scale-95 disabled:opacity-60"
                  >
                    {newsletterLoading
                       ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                       : <Send size={18} className="text-white" />}
                  </button>
               </form>
               <div className="flex flex-col gap-3 text-[11px] font-bold text-white/70 uppercase tracking-widest pt-4">
                  <Link to="/auth" className="hover:text-primary transition-colors flex items-center gap-2">{t("landing.footer.member_area", "Espace Collaborateur")} <ArrowUpRight size={12} /></Link>
                  <Link to="/contact" className="hover:text-primary transition-colors flex items-center gap-2">{t("landing.footer.quote_request", "Demande de Devis")} <ArrowUpRight size={12} /></Link>
               </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 sm:mt-28 pt-8 sm:pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 relative">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="text-[12px] text-white/80 font-medium tracking-wide">
              © {new Date().getFullYear()} <span className="text-white/50">{siteName}</span>. {t("landing.footer.rights", "Tous droits réservés.")}
            </p>
            <p className="text-[10px] text-white/60 uppercase tracking-[0.2em] font-semibold">{t("landing.footer.pulse", "Pulse de l'Agriculture Casamançaise")}</p>
          </div>
          
          <div className="flex gap-8 text-[12px] text-white/70 font-bold uppercase tracking-widest">
            <span className="cursor-default hover:text-primary transition-colors">{t("landing.footer.privacy", "Vie Privée")}</span>
            <span className="cursor-default hover:text-primary transition-colors">{t("landing.footer.terms", "Termes")}</span>
            <span className="cursor-default hover:text-primary transition-colors">{t("landing.footer.support", "Support")}</span>
          </div>

          <button 
            onClick={scrollToTop}
            className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary text-white transition-all duration-500 hover:shadow-glow group shadow-2xl"
          >
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
