import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Loader2, ArrowLeft, ChevronRight, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/brand/Logo";
import { useConfigValue } from "@/hooks/useSiteConfig";

type AuthMode = "login" | "forgot-password";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const logoUrlFromDb = useConfigValue("logo_url", "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Bienvenue dans votre espace CRPAZ.");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Identifiants invalides");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Lien de réinitialisation envoyé par email.");
      setMode("login");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">
      {/* LEFT SIDE: Visual & Narrative */}
      <div className="relative hidden lg:flex flex-col bg-sidebar overflow-hidden">
        {/* Background Image with Parallax-ready feel */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform hover:scale-110"
          style={{ 
            backgroundImage: 'url("/auth-bg.png")',
            transitionDuration: '10000ms'
          }}
        />
        
        {/* Overlays for readability and mood */}
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar/95 via-sidebar/40 to-transparent" />
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />

        {/* Narrative Content */}
        <div className="relative z-10 p-8 mt-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-px w-12 bg-gold/60" />
              <span className="text-gold font-bold uppercase tracking-[0.3em] text-[10px]">L'Héritage de la Casamance</span>
            </div>
            
            <h1 className="text-5xl xl:text-3xl font-semibold text-white leading-[1.1] tracking-tight">
              Cultiver l'Excellence, <br /> 
              <span className="text-gradient-gold">Nourrir l'Avenir.</span>
            </h1>
            
            <div className="mt-4 flex items-start gap-4 p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 max-w-lg">
              <Quote className="text-gold/40 flex-shrink-0" size={24} />
              <p className="text-white/80 italic text-sm leading-relaxed">
                "La CRPAZ incarne notre engagement pour une agriculture durable et prospère à Ziguinchor, soutenant chaque planteur dans sa quête de qualité."
              </p>
            </div>
          </motion.div>
        </div>

        {/* Decorative corner */}
        <div className="absolute top-0 right-0 p-8">
           <Logo variant="white" size={64} imageUrl={logoUrlFromDb} className="opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500" />
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-10 bg-background relative overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <Link to="/" className="inline-block mb-8 group">
              <Logo variant="luxury" size={100} imageUrl={logoUrlFromDb} className="hover:scale-105 transition-transform duration-500" />
            </Link>
            
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {mode === "login" ? "Espace de Gestion" : "Réinitialisation"}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm font-medium">
              {mode === "login" 
                ? "Accédez à votre tableau de bord coopératif" 
                : "Insérez votre email pour recevoir les instructions"}
            </p>
          </motion.div>

          {/* Forms Section */}
          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleLogin} 
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <Mail size={12} className="text-primary" /> Email Professionnel
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@crpaz.com"
                      required
                      className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all text-sm rounded-xl px-5"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                        <Lock size={12} className="text-primary" /> Mot de passe
                      </Label>
                      <button
                        type="button"
                        onClick={() => setMode("forgot-password")}
                        className="text-[11px] font-bold text-primary hover:text-accent transition-colors"
                      >
                        Oublié ?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all text-sm rounded-xl px-5"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-sm font-semibold uppercase tracking-widest gap-3 rounded-xl shadow-premium hover:shadow-glow transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>Se Connecter <ChevronRight size={18} /></>
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.form 
                key="forgot-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleForgotPassword} 
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="email-reset" className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                    <Mail size={12} className="text-primary" /> Email de récupération
                  </Label>
                  <Input
                    id="email-reset"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@crpaz.com"
                    required
                    className="h-14 bg-muted/30 border-border/50 text-sm rounded-xl px-5"
                  />
                </div>

                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-14 text-sm font-semibold uppercase tracking-widest rounded-xl"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      "Réinitialiser"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="w-full h-12 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ArrowLeft size={14} /> Retour à la connexion
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Decorative Divider */}
          <div className="mt-12 mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-border/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
            <div className="h-px flex-1 bg-border/40" />
          </div>

          <p className="text-center text-[11px] text-muted-foreground font-medium uppercase tracking-[0.1em] px-8 leading-relaxed">
            Plateforme d'excellence agricole au service de la région de Ziguinchor.
          </p>
        </div>

        {/* Global Footer in Login */}
        <div className="absolute bottom-10 text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest flex gap-8">
           <span>© 2026 CRPAZ</span>
           <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
           <span className="cursor-help">Support</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
