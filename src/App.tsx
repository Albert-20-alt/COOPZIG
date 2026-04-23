import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/context/ThemeContext";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import SiteMeta from "./components/SiteMeta";
import Logo from "@/components/brand/Logo";
import { initAnalytics, logPageView } from "./utils/analytics";

// Initialize Analytics globally
initAnalytics();

// Eager-loaded (always needed on first paint)
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const QuiSommesNous = lazy(() => import("./pages/QuiSommesNous"));
const PrixPublic = lazy(() => import("./pages/PrixPublic"));
const InvestisseursBoard = lazy(() => import("./pages/InvestisseursBoard"));
const Contact = lazy(() => import("./pages/Contact"));
const Projets = lazy(() => import("./pages/Projets"));
const Blog = lazy(() => import("./pages/Blog"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const AdminProjets = lazy(() => import("./pages/AdminProjets"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const ProjetDetail = lazy(() => import("./pages/ProjetDetail"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Producteurs = lazy(() => import("./pages/Producteurs"));
const Vergers = lazy(() => import("./pages/Vergers"));
const Recoltes = lazy(() => import("./pages/Recoltes"));
const Stocks = lazy(() => import("./pages/Stocks"));
const IntelligenceProduction = lazy(() => import("./pages/IntelligenceProduction"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Commandes = lazy(() => import("./pages/Commandes"));
const Precommandes = lazy(() => import("./pages/Precommandes"));
const Logistique = lazy(() => import("./pages/Logistique"));
const Finances = lazy(() => import("./pages/Finances"));
const JournalComptable = lazy(() => import("./pages/JournalComptable"));
const Cotisations = lazy(() => import("./pages/Cotisations"));
const Tresorerie = lazy(() => import("./pages/Tresorerie"));
const Facturation = lazy(() => import("./pages/Facturation"));
const Tendances = lazy(() => import("./pages/Tendances"));
const PertesPostRecolte = lazy(() => import("./pages/PertesPostRecolte"));
const PrixMarche = lazy(() => import("./pages/PrixMarche"));
const Demandes = lazy(() => import("./pages/Demandes"));
const GestionUtilisateurs = lazy(() => import("./pages/GestionUtilisateurs"));
const Supervision = lazy(() => import("./pages/Supervision"));
const Clients = lazy(() => import("./pages/Clients"));
const Performances = lazy(() => import("./pages/Performances"));
const GestionSite = lazy(() => import("./pages/GestionSite"));
const GestionDocuments = lazy(() => import("./pages/GestionDocuments"));
const GestionPrix = lazy(() => import("./pages/GestionPrix"));
const Rapports = lazy(() => import("./pages/Rapports"));
const FichesAnalytiques = lazy(() => import("./pages/FichesAnalytiques"));
const CampagnesEmail = lazy(() => import("./pages/CampagnesEmail"));
const GestionInvestisseurs = lazy(() => import("./pages/GestionInvestisseurs"));
const AdminMessages = lazy(() => import("./pages/AdminMessages"));
const CatalogueProduits = lazy(() => import("./pages/CatalogueProduits"));
const BotUploader = lazy(() => import("./pages/BotUploader"));
const Profil = lazy(() => import("./pages/Profil"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071410] overflow-hidden">
    {/* Ambient glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.15] rounded-full blur-[140px] pointer-events-none" />
    <div className="absolute top-1/4 right-1/3 w-[300px] h-[300px] bg-emerald-900/20 rounded-full blur-[100px] pointer-events-none" />

    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center gap-10"
    >
      {/* Pulsing rings */}
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.15, 0.04, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-56 h-56 rounded-full border border-primary/30"
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.06, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          className="absolute w-44 h-44 rounded-full border border-primary/40"
        />
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Logo size={110} variant="white" />
        </motion.div>
      </div>

      {/* Site name */}
      <div className="flex flex-col items-center gap-1.5">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-white font-bold tracking-[0.35em] uppercase text-sm"
        >
          CRPAZ
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="text-white/[0.35] text-[10px] tracking-[0.5em] uppercase font-medium"
        >
          Casamance
        </motion.p>
      </div>

      {/* Animated dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-primary block"
          />
        ))}
      </motion.div>
    </motion.div>
  </div>
);

const AnalyticsTracker = () => {
  const location = useLocation();
  useEffect(() => {
    logPageView(location.pathname + location.search);
    // Retour en haut de page à chaque changement de route (sauf s'il y a une ancre)
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location]);
  return null;
};

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SiteMeta />
      <Toaster />
      <Sonner />
      <ConfirmDialog />
      <BrowserRouter>
        <AnalyticsTracker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
            <Route path="/prix" element={<PrixPublic />} />
            <Route path="/bot-uploader" element={<BotUploader />} />
            <Route path="/investisseurs" element={<InvestisseursBoard />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/projets" element={<Projets />} />
            <Route path="/projets/:id" element={<ProjetDetail />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogArticle />} />
            <Route path="/admin-blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
            <Route path="/admin-projets" element={<ProtectedRoute><AdminProjets /></ProtectedRoute>} />
            <Route path="/admin-messages" element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/producteurs" element={<ProtectedRoute><Producteurs /></ProtectedRoute>} />
            <Route path="/vergers" element={<ProtectedRoute><Vergers /></ProtectedRoute>} />
            <Route path="/recoltes" element={<ProtectedRoute><Recoltes /></ProtectedRoute>} />
            <Route path="/stocks" element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
            <Route path="/intelligence" element={<ProtectedRoute><IntelligenceProduction /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/commandes" element={<ProtectedRoute><Commandes /></ProtectedRoute>} />
            <Route path="/precommandes" element={<ProtectedRoute><Precommandes /></ProtectedRoute>} />
            <Route path="/logistique" element={<ProtectedRoute><Logistique /></ProtectedRoute>} />
            <Route path="/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
            <Route path="/journal-comptable" element={<ProtectedRoute><JournalComptable /></ProtectedRoute>} />
            <Route path="/cotisations" element={<ProtectedRoute><Cotisations /></ProtectedRoute>} />
            <Route path="/tresorerie" element={<ProtectedRoute><Tresorerie /></ProtectedRoute>} />
            <Route path="/facturation" element={<ProtectedRoute><Facturation /></ProtectedRoute>} />
            <Route path="/tendances" element={<ProtectedRoute><Tendances /></ProtectedRoute>} />
            <Route path="/pertes" element={<ProtectedRoute><PertesPostRecolte /></ProtectedRoute>} />
            <Route path="/prix-marche" element={<ProtectedRoute><PrixMarche /></ProtectedRoute>} />
            <Route path="/demandes-public" element={<ProtectedRoute><Demandes /></ProtectedRoute>} />
            <Route path="/supervision" element={<ProtectedRoute><Supervision /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/performances" element={<ProtectedRoute><Performances /></ProtectedRoute>} />
            <Route path="/gestion-utilisateurs" element={<ProtectedRoute><GestionUtilisateurs /></ProtectedRoute>} />
            <Route path="/gestion-site" element={<ProtectedRoute><GestionSite /></ProtectedRoute>} />
            <Route path="/gestion-documents" element={<ProtectedRoute><GestionDocuments /></ProtectedRoute>} />
            <Route path="/gestion-prix" element={<ProtectedRoute><GestionPrix /></ProtectedRoute>} />
            <Route path="/rapports" element={<ProtectedRoute><Rapports /></ProtectedRoute>} />
            <Route path="/fiches-analytiques" element={<ProtectedRoute><FichesAnalytiques /></ProtectedRoute>} />
            <Route path="/campagnes-email" element={<ProtectedRoute><CampagnesEmail /></ProtectedRoute>} />
            <Route path="/catalogue" element={<ProtectedRoute><CatalogueProduits /></ProtectedRoute>} />
            <Route path="/gestion-investisseurs" element={<ProtectedRoute><GestionInvestisseurs /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
