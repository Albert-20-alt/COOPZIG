import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, TreePine, Sprout, Package, Brain,
  ShoppingBag, ShoppingCart, CalendarClock, Truck, BarChart3,
  TrendingUp, AlertTriangle, Coins, Menu, X, LogOut,
  Inbox, MessageSquare, ShieldCheck, Settings, BookOpen,
  PiggyBank, Wallet, FileText, Activity, BarChart2, Newspaper, FolderKanban,
  Moon, Sun, Tag, FileDown, Mail,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/brand/Logo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConfigValue } from "@/hooks/useSiteConfig";
import { useMyPermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/context/ThemeContext";

const navGroups = [
  {
    label: "Général",
    items: [
      { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, moduleKey: "dashboard" },
    ],
  },
  {
    label: "Production",
    items: [
      { to: "/producteurs",  label: "Producteurs",      icon: Users,       moduleKey: "producteurs" },
      { to: "/vergers",      label: "Vergers",           icon: TreePine,    moduleKey: "vergers" },
      { to: "/recoltes",     label: "Récoltes",          icon: Sprout,      moduleKey: "recoltes" },
      { to: "/stocks",       label: "Stocks",            icon: Package,     moduleKey: "stocks" },
      { to: "/intelligence", label: "Intelligence",      icon: Brain,       moduleKey: "intelligence" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { to: "/marketplace",    label: "Marketplace",  icon: ShoppingBag,  moduleKey: "marketplace" },
      { to: "/catalogue",      label: "Catalogue",    icon: Package,      moduleKey: "commandes" },
      { to: "/commandes",      label: "Commandes",    icon: ShoppingCart, moduleKey: "commandes" },
      { to: "/precommandes",   label: "Précommandes", icon: CalendarClock,moduleKey: "precommandes" },
      { to: "/demandes-public",label: "Demandes",     icon: Inbox,        moduleKey: "demandes" },
      { to: "/logistique",     label: "Logistique",    icon: Truck,      moduleKey: "logistique" },
      { to: "/clients",        label: "CRM Clients",   icon: Users,      moduleKey: "clients" },
      { to: "/performances",   label: "Performances",  icon: BarChart2,  moduleKey: "performances" },
    ],
  },
  {
    label: "Finances",
    items: [
      { to: "/finances",             label: "Finances",            icon: BarChart3, moduleKey: "finances" },
      { to: "/journal-comptable",    label: "Journal comptable",   icon: BookOpen,  moduleKey: "journal_comptable" },
      { to: "/cotisations",          label: "Cotisations",         icon: PiggyBank, moduleKey: "cotisations" },
      { to: "/tresorerie",           label: "Trésorerie",          icon: Wallet,    moduleKey: "tresorerie" },
      { to: "/facturation",          label: "Facturation",         icon: FileText,  moduleKey: "facturation" },
      { to: "/fiches-analytiques",   label: "Fiches Analytiques",  icon: BarChart2, moduleKey: "finances" },
    ],
  },
  {
    label: "Analyse",
    items: [
      { to: "/tendances",   label: "Tendances",          icon: TrendingUp,   moduleKey: "tendances" },
      { to: "/pertes",      label: "Pertes post-récolte",icon: AlertTriangle, moduleKey: "pertes" },
      { to: "/prix-marche", label: "Prix du marché",     icon: Coins,        moduleKey: "prix_marche" },
      { to: "/rapports",    label: "Rapports",           icon: FileDown,     moduleKey: "dashboard" },
    ],
  },
  {
    label: "Communication",
    items: [
      { to: "/admin-messages",   label: "Messages",          icon: MessageSquare, moduleKey: "messages" },
      { to: "/admin-blog",       label: "Blog",              icon: Newspaper,     moduleKey: "blog" },
      { to: "/admin-projets",    label: "Projets",           icon: FolderKanban,  moduleKey: "projets" },
      { to: "/campagnes-email",  label: "Campagnes Email",   icon: Mail,          moduleKey: "campagnes_email" },
    ],
  },
];

const NavItem = ({
  to, label, icon: Icon, isActive, badge, onClick,
}: {
  to: string; label: string; icon: any; isActive: boolean; badge?: number; onClick: () => void;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
      isActive
        ? "bg-[#1A2E1C] dark:bg-emerald-900/40 text-white font-medium"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200"
    }`}
  >
    <Icon
      size={16}
      className={
        isActive
          ? "text-white dark:text-emerald-400"
          : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
      }
    />
    <span className="flex-1 truncate">{label}</span>
    {badge != null && badge > 0 && (
      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </Link>
);

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const { hasAccess, roles } = useMyPermissions();
  
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (navRef.current) {
        const savedPos = sessionStorage.getItem("sidebarScrollPos");
        if (savedPos) {
          navRef.current.scrollTop = parseInt(savedPos, 10);
        }
      }
    }, 10);
    return () => clearTimeout(timeout);
  }, [roles, location.pathname]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem("sidebarScrollPos", e.currentTarget.scrollTop.toString());
  };

  const { data: unreadMessagesCount = 0 } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contact_messages" as any)
        .select("*", { count: "exact", head: true })
        .eq("statut", "Nouvelle");
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: unreadLeadsCount = 0 } = useQuery({
    queryKey: ["unread-leads-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("demandes")
        .select("*", { count: "exact", head: true })
        .eq("statut", "Nouvelle");
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const siteName = useConfigValue("site_name", "CRPAZ");
  const siteSubtitle = useConfigValue("site_subtitle", "Coopérative de Ziguinchor");
  const logoUrlFromDb = useConfigValue("logo_url", "");

  const isSuperAdmin = roles?.includes("superadmin") ?? false;
  const isAdmin = roles?.includes("admin") ?? false;
  const showAdminSection = isSuperAdmin || isAdmin;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getBadge = (to: string) => {
    if (to === "/admin-messages") return unreadMessagesCount as number;
    if (to === "/demandes-public") return unreadLeadsCount as number;
    return 0;
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        aria-label={mobileOpen ? "Fermer" : "Menu"}
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1e2d45] p-2 rounded-lg shadow-sm text-gray-600 dark:text-gray-400"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-[#0d1525] z-40 flex flex-col border-r border-gray-100 dark:border-[#1e2d45] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-[#1e2d45]">
          <Link to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <Logo size={36} variant="premium" siteName={siteName} imageUrl={logoUrlFromDb} />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{siteName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">{siteSubtitle}</p>
            </div>
          </Link>
        </div>

        {/* Sticky General Group */}
        {hasAccess("dashboard") && (
          <div className="flex-shrink-0 px-3 pt-5 pb-3 border-b border-gray-100/60 dark:border-[#1e2d45]/60 z-10 bg-gray-50/30 dark:bg-black/10">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-2">
              Général
            </p>
            <div className="space-y-0.5">
              <NavItem
                to="/dashboard"
                label="Tableau de bord"
                icon={LayoutDashboard}
                isActive={location.pathname === "/dashboard"}
                onClick={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Scrollable Nav */}
        <nav 
          ref={navRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar"
        >
          {navGroups.filter(g => g.label !== "Général").map((group) => {
            const visibleItems = group.items.filter(item => hasAccess(item.moduleKey));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-1">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavItem
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      isActive={location.pathname === item.to}
                      badge={getBadge(item.to)}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Admin / SuperAdmin section */}
          {showAdminSection && (
            <div>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-1">
                Administration
              </p>
              <div className="space-y-0.5">
                {[
                  ...(isSuperAdmin ? [
                    { to: "/supervision",          label: "Supervision",       icon: Activity },
                    { to: "/gestion-utilisateurs", label: "Utilisateurs",      icon: ShieldCheck },
                    { to: "/gestion-site",         label: "Paramètres du site",icon: Settings },
                    { to: "/gestion-prix",         label: "Page Prix",         icon: Tag },
                    { to: "/gestion-documents",    label: "Documents",         icon: FileText },
                    { to: "/gestion-investisseurs",label: "Infos publiques",   icon: ShoppingBag },
                  ] : [
                    { to: "/gestion-utilisateurs", label: "Utilisateurs",      icon: ShieldCheck },
                    { to: "/gestion-site",         label: "Paramètres du site",icon: Settings },
                    { to: "/gestion-prix",         label: "Page Prix",         icon: Tag },
                    { to: "/gestion-documents",    label: "Documents",         icon: FileText },
                  ]),
                ].map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    isActive={location.pathname === item.to}
                    badge={0}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 dark:border-[#1e2d45] space-y-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200 transition-all"
          >
            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-gray-400" />}
            <span className="flex-1 text-left">{isDark ? "Mode clair" : "Mode sombre"}</span>
            <span className={`w-8 h-4 rounded-full transition-colors ${isDark ? "bg-emerald-600" : "bg-gray-200"} relative`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-4" : "translate-x-0.5"}`} />
            </span>
          </button>

          {user ? (
            <div className="space-y-1">
              <Link
                to="/profil"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{user.email}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">Voir Profil • Connecté</p>
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200 transition-all"
              >
                <LogOut size={16} className="text-gray-400 dark:text-gray-500" />
                Déconnexion
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="block text-center px-3 py-2 rounded-lg bg-[#1A2E1C] text-white text-sm font-medium hover:bg-[#1A2E1C]/90 transition-colors"
            >
              Se connecter
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
