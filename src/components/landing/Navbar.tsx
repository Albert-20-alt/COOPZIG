import { Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight, ChevronRight, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConfigValue } from "@/hooks/useSiteConfig";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";

const baseNavLinks = [
  { labelKey: "nav.about", href: "/qui-sommes-nous", isRoute: true },
  { labelKey: "landing.footer.nav_markets", href: "/prix", isRoute: true },
  { labelKey: "landing.footer.nav_projects", href: "/projets", isRoute: true },
  { labelKey: "landing.footer.nav_news", href: "/blog", isRoute: true },
  { labelKey: "nav.contact", href: "/contact", isRoute: true },
];

interface NavbarProps {
  forceScrolled?: boolean;
}

const Navbar = ({ forceScrolled = false }: NavbarProps = {}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const { isDark, toggle } = useTheme();

  const siteName = useConfigValue("site_name", "CRPAZ");
  const siteSubtitle = useConfigValue("site_subtitle", t("landing.footer.site_subtitle", "Coopérative de Ziguinchor"));
  const logoUrl = useConfigValue("logo_url", "");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const effectiveScrolled = scrolled || forceScrolled;

  const navLinks = baseNavLinks.map(link => ({
    ...link,
    label: t(link.labelKey, link.labelKey),
  }));

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="fixed top-0 w-full z-50">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full transition-all duration-500 ${
          effectiveScrolled
            ? "bg-white/95 dark:bg-[#0d1525]/95 backdrop-blur-3xl"
            : "bg-transparent"
        }`}
        style={
          effectiveScrolled
            ? {
                boxShadow:
                  "0 1px 0 0 rgba(0,0,0,0.06), 0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -1px rgba(0,0,0,0.03)",
              }
            : {}
        }
      >
        {/* Accent line — visible when scrolled */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px] origin-left"
          style={{
            background: "linear-gradient(90deg, #1A2E1C 0%, #3d7a42 40%, #F0B130 100%)",
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: effectiveScrolled ? 1 : 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-8 xl:px-16">
          <div
            className={`flex items-center justify-between transition-all duration-500 ${
              effectiveScrolled ? "h-[62px]" : "h-[76px]"
            }`}
          >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div
                className={`transition-all duration-500 ${
                  effectiveScrolled ? "w-8 h-8" : "w-10 h-10"
                }`}
              >
                <Logo
                  size={effectiveScrolled ? 32 : 40}
                  variant={effectiveScrolled ? "premium" : "white"}
                  siteName={siteName}
                  imageUrl={logoUrl}
                />
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className={`font-bold tracking-tight transition-all duration-500 ${
                    effectiveScrolled
                      ? "text-[17px] text-gray-900 dark:text-gray-100"
                      : "text-[18px] text-white"
                  }`}
                >
                  {siteName}
                </span>
                <span
                  className={`hidden sm:block text-[7px] font-bold tracking-[0.4em] uppercase mt-0.5 transition-all duration-500 ${
                    effectiveScrolled ? "text-amber-500" : "text-white/40"
                  }`}
                >
                  {siteSubtitle}
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5 lg:gap-0 xl:gap-0.5">
              {navLinks.map((link) => {
                const active = link.isRoute && isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`relative whitespace-nowrap px-4 lg:px-2.5 xl:px-4 py-2 text-[13.5px] font-medium tracking-wide transition-colors duration-200 rounded-lg group ${
                      active
                        ? effectiveScrolled
                          ? "text-gray-900 dark:text-gray-100"
                          : "text-white"
                        : effectiveScrolled
                        ? "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute bottom-0.5 left-4 right-4 h-[1.5px] rounded-full transition-all duration-300 origin-center ${
                        active
                          ? "scale-x-100 opacity-100"
                          : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-60"
                      } ${effectiveScrolled ? "bg-gray-900 dark:bg-gray-100" : "bg-white"}`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {/* Dark mode toggle */}
              <button
                onClick={toggle}
                aria-label={isDark ? "Mode clair" : "Mode sombre"}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  effectiveScrolled
                    ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <div
                className={`transition-colors duration-300 ${
                  effectiveScrolled ? "text-gray-600 dark:text-gray-300" : "text-white/80"
                }`}
              >
                <LanguageSwitcher />
              </div>

              {/* Divider */}
              <div
                className={`w-px h-4 mx-1 transition-colors duration-300 ${
                  effectiveScrolled ? "bg-gray-200 dark:bg-white/10" : "bg-white/20"
                }`}
              />

              {!user ? (
                <Link
                  to="/auth"
                  className="group relative flex items-center shrink-0 whitespace-nowrap gap-2 px-6 py-2.5 rounded-full text-[13px] font-semibold text-white overflow-hidden transition-all duration-300 hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, #1A2E1C 0%, #2d5230 100%)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="relative z-10">{t("nav.login", "Connexion")}</span>
                  <ArrowRight
                    size={13}
                    className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className="group relative flex items-center shrink-0 whitespace-nowrap gap-2 px-5 lg:px-4 xl:px-5 py-2.5 rounded-full text-[13px] font-semibold text-white overflow-hidden transition-all duration-300 hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, #1A2E1C 0%, #2d5230 100%)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="relative z-10">{t("nav.dashboard", "Mon tableau de bord")}</span>
                  <ArrowRight
                    size={13}
                    className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={`lg:hidden p-2 rounded-xl transition-all ${
                effectiveScrolled
                  ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-[82%] max-w-[340px] bg-white dark:bg-[#0d1525] z-[70] lg:hidden flex flex-col"
              style={{ boxShadow: "-24px 0 80px rgba(0,0,0,0.15)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-gray-100 dark:border-[#1e2d45]">
                <div className="flex items-center gap-3">
                  <Logo size={30} variant="premium" siteName={siteName} imageUrl={logoUrl} />
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-none">{siteName}</p>
                    <p className="text-[8px] font-bold tracking-[0.3em] uppercase text-amber-500 mt-1">
                      {siteSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Nav Links */}
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                {navLinks.map((link, idx) => {
                  const active = link.isRoute && isActive(link.href);
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + idx * 0.05, duration: 0.3 }}
                    >
                      <Link
                        to={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all ${
                          active
                            ? "bg-[#1A2E1C] text-white"
                            : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        {link.label}
                        <ChevronRight
                          size={16}
                          className={`transition-colors ${active ? "text-white/60" : "text-gray-300 dark:text-gray-600"}`}
                        />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer CTA */}
              <div className="px-4 pb-8 pt-4 border-t border-gray-100 dark:border-[#1e2d45] space-y-3">
                {/* Language Switcher row */}
                <div className="w-full flex items-center justify-between px-4 py-1.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-all">
                  <span className="font-medium">Langue / Language</span>
                  <div className="-mr-3 flex items-center">
                    <LanguageSwitcher />
                  </div>
                </div>

                {/* Dark mode toggle row */}
                <button
                  onClick={toggle}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-all"
                >
                  {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-gray-400" />}
                  <span className="flex-1 text-left font-medium">{isDark ? "Mode clair" : "Mode sombre"}</span>
                  <span className={`w-8 h-4 rounded-full transition-colors ${isDark ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"} relative`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-4" : "translate-x-0.5"}`} />
                  </span>
                </button>

                {!user ? (
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-white text-[15px]"
                    style={{
                      background: "linear-gradient(135deg, #1A2E1C 0%, #2d5230 100%)",
                      boxShadow: "0 4px 20px rgba(26,46,28,0.25)",
                    }}
                  >
                    {t("nav.login", "Connexion")}
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-white text-[15px]"
                    style={{
                      background: "linear-gradient(135deg, #1A2E1C 0%, #2d5230 100%)",
                      boxShadow: "0 4px 20px rgba(26,46,28,0.25)",
                    }}
                  >
                    {t("nav.dashboard", "Mon tableau de bord")}
                    <ArrowRight size={16} />
                  </Link>
                )}
                <p className="text-center text-[10px] text-gray-400 uppercase tracking-[0.25em] font-medium">
                  © {new Date().getFullYear()} {siteName}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
