import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sprout, Leaf, TrendingUp, PiggyBank, Package, MapPin,
  Calendar, Award, Phone, Mail, Users, CheckCircle,
  Clock, XCircle, Navigation, Hash, UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(0)}k`
    : String(n);

const fmtDate = (d: string) =>
  format(new Date(d), "dd MMM yyyy", { locale: fr });

const etatBadge: Record<string, string> = {
  Récolte:    "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Floraison:  "bg-pink-500/15 text-pink-400 border-pink-500/25",
  Maturation: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Production: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  Repos:      "bg-gray-500/15 text-gray-400 border-gray-500/25",
};

const statutBadge: Record<string, { cls: string; icon: React.ElementType }> = {
  Payé:        { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", icon: CheckCircle },
  "En attente":{ cls: "bg-amber-500/15 text-amber-400 border-amber-500/25",      icon: Clock },
  "En retard": { cls: "bg-red-500/15 text-red-400 border-red-500/25",            icon: XCircle },
};

// ── KPI card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, color, bg }: {
  label: string; value: string; icon: React.ElementType;
  color: string; bg: string;
}) => (
  <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.07] flex flex-col gap-3 hover:bg-white/[0.07] transition-all">
    <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center`}>
      <Icon size={18} className={color} />
    </div>
    <div>
      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
    </div>
  </div>
);

// ── Section title ─────────────────────────────────────────────────────────────
const SectionTitle = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-white/[0.06] mb-4">
    <Icon size={13} className="text-emerald-400/60" /> {label}
  </h3>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const MonEspace = () => {
  const { user } = useAuth();

  const { data: producteur, isLoading } = useQuery({
    queryKey: ["mon-espace-producteur", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producteurs")
        .select(`*, vergers(*), recoltes(*), cotisations(*)`)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // ── Derived KPIs ─────────────────────────────────────────────────────────
  const recoltes: any[] = producteur?.recoltes ?? [];
  const cotisations: any[] = producteur?.cotisations ?? [];
  const vergers: any[] = producteur?.vergers ?? [];

  const totalProd = recoltes.reduce((s, r) => s + (r.quantite || 0), 0);
  const totalCotis = cotisations
    .filter((c) => c.statut === "Payé")
    .reduce((s, c) => s + Number(c.montant), 0);
  const resteAPayer = cotisations
    .filter((c) => c.statut !== "Payé")
    .reduce((s, c) => s + Number(c.montant), 0);

  // ── Chart: production par année ───────────────────────────────────────────
  const productionChart = useMemo(() => {
    const map: Record<string, number> = {};
    recoltes.forEach((r) => {
      if (!r.date_disponibilite) return;
      const y = new Date(r.date_disponibilite).getFullYear().toString();
      map[y] = (map[y] || 0) + (r.quantite || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => +a - +b)
      .map(([annee, production]) => ({ annee, production }));
  }, [recoltes]);

  // ── Chart: cotisations cumulées ───────────────────────────────────────────
  const cotisChart = useMemo(() => {
    let cumul = 0;
    return [...cotisations]
      .filter((c) => c.statut === "Payé")
      .sort((a, b) => new Date(a.date_paiement).getTime() - new Date(b.date_paiement).getTime())
      .map((c) => {
        cumul += Number(c.montant);
        return {
          date: format(new Date(c.date_paiement), "MMM yy", { locale: fr }),
          cumul,
        };
      });
  }, [cotisations]);

  // ── States ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout title="Mon Espace">
        <div className="flex items-center justify-center h-64 text-white/40">
          Chargement…
        </div>
      </DashboardLayout>
    );
  }

  if (!producteur) {
    return (
      <DashboardLayout title="Mon Espace">
        <div className="max-w-lg mx-auto mt-20 text-center p-10 rounded-3xl bg-white/[0.04] border border-white/[0.07]">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
            <UserCircle size={30} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white/90 mb-3">Profil non lié</h2>
          <p className="text-sm text-white/50 leading-relaxed">
            Votre compte n'est pas encore associé à un profil producteur.
            Contactez l'administrateur pour activer votre espace membre.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const initials = producteur.nom.substring(0, 2).toUpperCase();

  return (
    <DashboardLayout title="Mon Espace">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="bg-[#0B1A12] rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="absolute top-[-40%] right-[-5%] w-80 h-80 bg-emerald-500/[0.06] rounded-full blur-[60px]" />

          <div className="relative z-10 p-8 flex items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-white/[0.07] border border-white/10 flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
              {producteur.photo_url
                ? <img src={producteur.photo_url} alt={producteur.nom} className="w-full h-full object-cover rounded-2xl" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-3xl font-bold text-white">{producteur.nom}</h1>
                <span className={`flex items-center gap-1.5 text-[9px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border ${
                  producteur.statut_actif ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${producteur.statut_actif ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                  {producteur.statut_actif ? "Actif" : "Inactif"}
                </span>
                {producteur.numero_membre && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <Hash size={10} /> {producteur.numero_membre}
                  </span>
                )}
                {producteur.genre && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-full">
                    <UserCircle size={10} /> {producteur.genre}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-5 text-white/50 text-xs flex-wrap font-medium">
                {producteur.localisation && (
                  <span className="flex items-center gap-1.5"><MapPin size={13} className="text-white/30" /> {producteur.localisation}</span>
                )}
                {producteur.date_adhesion && (
                  <span className="flex items-center gap-1.5"><Calendar size={13} className="text-white/30" /> Membre depuis {format(new Date(producteur.date_adhesion), "MMMM yyyy", { locale: fr })}</span>
                )}
                {producteur.certification && (
                  <span className="flex items-center gap-1.5 text-amber-400/80"><Award size={13} /> {producteur.certification}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Production totale"  value={`${totalProd.toLocaleString()} T`} icon={Package}  color="text-emerald-400" bg="bg-emerald-500/15" />
          <KpiCard label="Vergers actifs"     value={`${vergers.length}`}               icon={Sprout}   color="text-teal-400"   bg="bg-teal-500/15" />
          <KpiCard label="Cotisations payées" value={`${fmt(totalCotis)} F`}            icon={PiggyBank} color="text-amber-400" bg="bg-amber-500/15" />
          <KpiCard label="Reste à payer"      value={`${fmt(resteAPayer)} F`}           icon={TrendingUp} color={resteAPayer > 0 ? "text-red-400" : "text-blue-400"} bg={resteAPayer > 0 ? "bg-red-500/15" : "bg-blue-500/15"} />
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-1.5 h-auto gap-1 w-full flex">
            {[
              { v: "overview",     icon: TrendingUp, label: "Vue d'ensemble" },
              { v: "vergers",      icon: Sprout,     label: `Vergers (${vergers.length})` },
              { v: "recoltes",     icon: Leaf,       label: `Récoltes (${recoltes.length})` },
              { v: "cotisations",  icon: PiggyBank,  label: `Cotisations (${cotisations.length})` },
            ].map((t) => (
              <TabsTrigger key={t.v} value={t.v}
                className="flex-1 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none text-white/40 rounded-xl gap-1.5 text-[11px] font-bold tracking-wide px-3 py-2.5 transition-all">
                <t.icon size={14} /> <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Vue d'ensemble ──────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Production chart */}
              <div className="bg-white/[0.04] rounded-2xl border border-white/[0.07] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                  <Package size={13} className="text-emerald-400/60" />
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Production par Année</span>
                </div>
                <div className="p-5 h-56">
                  {productionChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productionChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="annee" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }} tickLine={false} axisLine={false} dy={8} />
                        <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }} tickLine={false} axisLine={false} dx={-8} />
                        <Tooltip formatter={(v) => [`${v} T`, "Production"]} cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{ background: "#0F2318", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, padding: "10px", color: "#fff" }} />
                        <Bar dataKey="production" fill="#4ADE80" radius={[5, 5, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-white/30">
                      <Package size={28} className="opacity-40" />
                      <p className="text-sm font-medium">Aucune récolte enregistrée</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cotisations chart */}
              <div className="bg-white/[0.04] rounded-2xl border border-white/[0.07] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                  <PiggyBank size={13} className="text-amber-400/60" />
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Cotisations Cumulées</span>
                </div>
                <div className="p-5 h-56">
                  {cotisChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cotisChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cotisGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }} tickLine={false} axisLine={false} dy={8} />
                        <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} dx={-8} />
                        <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FCFA`, "Cumul"]}
                          contentStyle={{ background: "#0F2318", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, padding: "10px", color: "#fff" }} />
                        <Area type="monotone" dataKey="cumul" stroke="#F59E0B" strokeWidth={2.5} fill="url(#cotisGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-white/30">
                      <PiggyBank size={28} className="opacity-40" />
                      <p className="text-sm font-medium">Aucune cotisation payée</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Infos personnelles */}
            <div className="bg-white/[0.04] rounded-2xl border border-white/[0.07] p-6">
              <SectionTitle icon={MapPin} label="Mes Informations" />
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Phone, label: "Téléphone", val: producteur.telephone },
                  { icon: Mail, label: "Email", val: producteur.email },
                  { icon: Leaf, label: "Superficie", val: producteur.superficie ? `${producteur.superficie} ha` : null },
                  { icon: Award, label: "Certification", val: producteur.certification },
                ].filter((r) => r.val).map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 flex-shrink-0">
                      <r.icon size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{r.label}</p>
                      <p className="text-sm font-semibold text-white/80">{r.val}</p>
                    </div>
                  </div>
                ))}
                {producteur.cultures?.length > 0 && (
                  <div className="sm:col-span-2 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                      <Sprout size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2">Cultures pratiquées</p>
                      <div className="flex flex-wrap gap-2">
                        {producteur.cultures.map((c: string) => (
                          <span key={c} className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {(producteur.latitude && producteur.longitude) && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 flex-shrink-0">
                      <Navigation size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">GPS</p>
                      <a href={`https://maps.google.com/?q=${producteur.latitude},${producteur.longitude}`} target="_blank" rel="noreferrer"
                        className="text-sm font-semibold text-blue-400 hover:underline">
                        {Number(producteur.latitude).toFixed(4)}, {Number(producteur.longitude).toFixed(4)}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Mes Vergers ─────────────────────────────────────────────── */}
          <TabsContent value="vergers" className="mt-5">
            {vergers.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.03] rounded-2xl border border-dashed border-white/[0.08]">
                <Sprout size={36} className="mx-auto mb-4 text-white/20" />
                <p className="text-sm text-white/40 font-medium">Aucun verger enregistré</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {vergers.map((v: any) => (
                  <div key={v.id} className="bg-white/[0.04] rounded-2xl border border-white/[0.07] p-5 hover:bg-white/[0.07] transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-base font-bold text-white/90 mb-1.5">{v.nom}</h4>
                        <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border", etatBadge[v.etat] || etatBadge.Repos)}>
                          {v.etat}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white/90">{v.superficie || 0}</p>
                        <p className="text-xs font-bold text-white/30">HA</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/[0.06] space-y-2 text-sm text-white/55">
                      {v.culture && <p className="flex items-center gap-2"><Leaf size={13} className="text-white/30" /> {v.culture}</p>}
                      {v.zone && <p className="flex items-center gap-2"><MapPin size={13} className="text-white/30" /> {v.zone}</p>}
                      {v.estimation_rendement && (
                        <p className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <TrendingUp size={13} className="text-emerald-400/70" /> Rendement est. : {v.estimation_rendement} T/ha
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Mes Récoltes ────────────────────────────────────────────── */}
          <TabsContent value="recoltes" className="mt-5">
            {recoltes.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.03] rounded-2xl border border-dashed border-white/[0.08]">
                <Package size={36} className="mx-auto mb-4 text-white/20" />
                <p className="text-sm text-white/40 font-medium">Aucune récolte enregistrée</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...recoltes]
                  .sort((a, b) => new Date(b.date_disponibilite).getTime() - new Date(a.date_disponibilite).getTime())
                  .map((r: any) => (
                  <div key={r.id} className="bg-white/[0.04] rounded-xl border border-white/[0.07] p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all">
                    <div>
                      <p className="font-bold text-white/90 text-sm">{r.produit}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-white/40 font-medium">
                        {r.date_disponibilite && (
                          <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(r.date_disponibilite)}</span>
                        )}
                        {r.qualite && (
                          <span className="flex items-center gap-1"><Award size={10} /> {r.qualite}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-emerald-400">{r.quantite}</p>
                      <p className="text-[10px] text-white/30 font-bold uppercase">{r.unite || "T"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Mes Cotisations ─────────────────────────────────────────── */}
          <TabsContent value="cotisations" className="mt-5 space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total payé", value: `${fmt(totalCotis)} F`, cls: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { label: "Transactions", value: cotisations.filter((c) => c.statut === "Payé").length, cls: "text-white/90" },
                { label: "Reste dû", value: `${fmt(resteAPayer)} F`, cls: resteAPayer > 0 ? "text-red-400" : "text-white/50", bg: resteAPayer > 0 ? "bg-red-500/10 border-red-500/20" : undefined },
              ].map((s, i) => (
                <div key={i} className={cn("rounded-xl p-4 border flex flex-col items-center text-center", s.bg || "bg-white/[0.04] border-white/[0.07]")}>
                  <p className={`text-2xl font-black mb-1 ${s.cls}`}>{s.value}</p>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            {cotisations.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.03] rounded-2xl border border-dashed border-white/[0.08]">
                <PiggyBank size={36} className="mx-auto mb-4 text-white/20" />
                <p className="text-sm text-white/40 font-medium">Aucune cotisation enregistrée</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...cotisations]
                  .sort((a, b) => new Date(b.date_paiement).getTime() - new Date(a.date_paiement).getTime())
                  .map((c: any) => {
                    const cfg = statutBadge[c.statut] || statutBadge["En attente"];
                    const Icon = cfg.icon;
                    return (
                      <div key={c.id} className="bg-white/[0.04] rounded-xl border border-white/[0.07] p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", cfg.cls)}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-white/90 text-sm">{c.periode}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/40">
                              {c.date_paiement && <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(c.date_paiement)}</span>}
                              {c.mode_paiement && <span>{c.mode_paiement}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-white/90">{Number(c.montant).toLocaleString()}</p>
                          <p className="text-[10px] text-white/30 font-bold uppercase">FCFA</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MonEspace;
