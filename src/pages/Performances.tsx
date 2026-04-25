import { useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, ShoppingCart, Wallet, Package,
  Users, Award, BarChart2, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const fmtMoney = (n: number) => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const fmtMoneyFull = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

const COLORS = ["#1A2E1C", "#4CAF50", "#81C784", "#A5D6A7", "#C8E6C9", "#E8F5E9"];

const PIE_STATUS_COLORS: Record<string, string> = {
  "Livrée":    "#22c55e",
  "En cours":  "#a855f7",
  "Confirmée": "#3b82f6",
  "En attente":"#f59e0b",
  "Annulée":   "#ef4444",
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{fmtMoneyFull(p.value)}</p>
      ))}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Performances = () => {
  const { data: commandes = [], isLoading } = useQuery({
    queryKey: ["performances-commandes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commandes")
        .select("id, produit_nom, quantite, montant, statut, created_at")
        .eq("est_precommande", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // ── Revenue by month (last 6 months) ──────────────────────────────────────
  const revenueByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const key = format(subMonths(now, i), "MMM yyyy", { locale: fr });
      months[key] = 0;
    }
    for (const c of commandes as any[]) {
      if (c.statut === "Annulée") continue;
      const key = format(parseISO(c.created_at), "MMM yyyy", { locale: fr });
      if (key in months) months[key] += Number(c.montant || 0);
    }
    return Object.entries(months).map(([mois, ca]) => ({ mois, ca }));
  }, [commandes]);

  // ── Top 6 products by revenue ──────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map = new Map<string, { produit: string; ca: number; qte: number }>();
    for (const c of commandes as any[]) {
      if (c.statut === "Annulée") continue;
      const k = c.produit_nom;
      if (!map.has(k)) map.set(k, { produit: k, ca: 0, qte: 0 });
      const row = map.get(k)!;
      row.ca += Number(c.montant || 0);
      row.qte += Number(c.quantite || 0);
    }
    return Array.from(map.values()).sort((a, b) => b.ca - a.ca).slice(0, 6);
  }, [commandes]);

  // ── Top 5 buyers ───────────────────────────────────────────────────────────
  const topBuyers = useMemo(() => {
    const map = new Map<string, { name: string; ca: number; orders: number }>();
    for (const c of commandes as any[]) {
      if (c.statut === "Annulée") continue;
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      const name = profile?.full_name || profile?.entreprise || "Inconnu";
      if (!map.has(name)) map.set(name, { name, ca: 0, orders: 0 });
      const row = map.get(name)!;
      row.ca += Number(c.montant || 0);
      row.orders += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.ca - a.ca).slice(0, 5);
  }, [commandes]);

  // ── Status breakdown ───────────────────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of commandes as any[]) {
      map.set(c.statut, (map.get(c.statut) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [commandes]);

  // ── Global KPIs ────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const valid = (commandes as any[]).filter(c => c.statut !== "Annulée");
    const totalCA = valid.reduce((s: number, c: any) => s + Number(c.montant || 0), 0);
    const totalOrders = valid.length;
    const avgOrder = totalOrders ? Math.round(totalCA / totalOrders) : 0;
    const delivered = valid.filter((c: any) => c.statut === "Livrée").length;
    const deliveryRate = totalOrders ? Math.round((delivered / totalOrders) * 100) : 0;
    // This month
    const thisMonth = format(new Date(), "MMM yyyy", { locale: fr });
    const thisMonthCA = valid
      .filter((c: any) => format(parseISO(c.created_at), "MMM yyyy", { locale: fr }) === thisMonth)
      .reduce((s: number, c: any) => s + Number(c.montant || 0), 0);
    return { totalCA, totalOrders, avgOrder, deliveryRate, thisMonthCA };
  }, [commandes]);

  return (
    <DashboardLayout title="Performances commerciales" subtitle="Analyse des ventes, produits et clients">
      <div className="space-y-6">

        {/* KPI row - Quantum Editorial Style */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "CA total",        value: fmtMoneyFull(kpis.totalCA),     icon: Wallet,       color: "text-emerald-600", bg: "bg-emerald-50", variant: "default" },
            { label: "Ce mois-ci",      value: fmtMoneyFull(kpis.thisMonthCA), icon: TrendingUp,   color: "text-blue-600",    bg: "bg-blue-50",    variant: "blue" },
            { label: "Commandes",       value: kpis.totalOrders,               icon: ShoppingCart, color: "text-purple-600",  bg: "bg-purple-50",  variant: "default" },
            { label: "Panier moyen",    value: fmtMoneyFull(kpis.avgOrder),    icon: Target,       color: "text-amber-600",   bg: "bg-amber-50",   variant: "gold" },
            { label: "Taux livraison",  value: `${kpis.deliveryRate}%`,        icon: Package,      color: "text-teal-600",    bg: "bg-teal-50",    variant: "default" },
          ].map(({ label, value, icon: Icon, color, bg, variant }) => (
            <div key={label} className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-colors" />
              
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-sm relative z-10",
                variant === "gold" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : 
                variant === "blue" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : 
                "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
              )}>
                <Icon size={18} strokeWidth={2.5} />
              </div>
              
              <div className="relative z-10">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-1">{value}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue trend + status pie - Quantum Containers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue by month */}
          <div className="lg:col-span-2 bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                   <BarChart2 size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Trajectoire Commerciale</h3>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Chiffre d'affaires — 6 derniers mois</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Actif</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueByMonth} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" opacity={0.1} />
                <XAxis 
                  dataKey="mois" 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tickFormatter={fmtMoney} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  width={40} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<CustomBarTooltip />} />
                <Bar dataKey="ca" fill="#1A2E1C" radius={[6, 6, 0, 0]} name="CA" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie */}
          <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-6 overflow-hidden relative group">
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                 <Target size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Répartition Opérationnelle</h3>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Statuts des commandes</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie 
                  data={statusBreakdown} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={65} 
                  outerRadius={85} 
                  dataKey="value" 
                  paddingAngle={5}
                  stroke="none"
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 800 }}
                  formatter={(v: any) => [`${v} commandes`]} 
                />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top products + top buyers - Quantum High Density */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top products */}
          <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-6 overflow-hidden relative group">
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                 <Package size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Performance Produit</h3>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Top produits par CA</p>
              </div>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12 italic">Aucune donnée de vente</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" opacity={0.1} />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="produit" 
                    width={120} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<CustomBarTooltip />} />
                  <Bar dataKey="ca" fill="#4CAF50" radius={[0, 4, 4, 0]} name="CA" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top buyers */}
          <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-6 overflow-hidden relative group">
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                 <Award size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Analyse Clientèle</h3>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Top 5 acheteurs stratégiques</p>
              </div>
            </div>
            {topBuyers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12 italic">Aucune donnée client</p>
            ) : (
              <div className="space-y-4">
                {topBuyers.map((b, i) => {
                  const pct = topBuyers[0].ca > 0 ? Math.round((b.ca / topBuyers[0].ca) * 100) : 0;
                  return (
                    <div key={b.name} className="relative group/row">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black tracking-tighter shadow-sm",
                            i === 0 ? "bg-amber-400 text-white shadow-amber-500/20" :
                            i === 1 ? "bg-gray-300 text-white shadow-gray-500/20" :
                            i === 2 ? "bg-orange-300 text-white shadow-orange-500/20" : 
                            "bg-gray-100 dark:bg-white/5 text-gray-400"
                          )}>{i + 1}</span>
                          <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight truncate max-w-[140px]">{b.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{fmtMoney(b.ca)}</span>
                          <span className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">FCFA</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-50 dark:border-white/5">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000 ease-out",
                            i === 0 ? "bg-amber-400" : "bg-[#1A2E1C]"
                          )} 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Performances;
