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

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "CA total",        value: fmtMoneyFull(kpis.totalCA),     icon: Wallet,       color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Ce mois-ci",      value: fmtMoneyFull(kpis.thisMonthCA), icon: TrendingUp,   color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Commandes",       value: kpis.totalOrders,               icon: ShoppingCart, color: "text-purple-600",  bg: "bg-purple-50" },
            { label: "Panier moyen",    value: fmtMoneyFull(kpis.avgOrder),    icon: Target,       color: "text-amber-600",   bg: "bg-amber-50" },
            { label: "Taux livraison",  value: `${kpis.deliveryRate}%`,        icon: Package,      color: "text-teal-600",    bg: "bg-teal-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", bg)}>
                <Icon size={18} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue trend + status pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue by month */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-[#1A2E1C]" />
              <h3 className="text-sm font-semibold text-gray-800">Chiffre d'affaires — 6 derniers mois</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByMonth} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtMoney} tick={{ fontSize: 11 }} width={55} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="ca" fill="#1A2E1C" radius={[4, 4, 0, 0]} name="CA" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-[#1A2E1C]" />
              <h3 className="text-sm font-semibold text-gray-800">Statuts des commandes</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} commandes`]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top products + top buyers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top products */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-[#1A2E1C]" />
              <h3 className="text-sm font-semibold text-gray-800">Top produits par CA</h3>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtMoney} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="produit" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="ca" fill="#4CAF50" radius={[0, 4, 4, 0]} name="CA" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top buyers */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-[#1A2E1C]" />
              <h3 className="text-sm font-semibold text-gray-800">Top 5 acheteurs</h3>
            </div>
            {topBuyers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {topBuyers.map((b, i) => {
                  const pct = topBuyers[0].ca > 0 ? Math.round((b.ca / topBuyers[0].ca) * 100) : 0;
                  return (
                    <div key={b.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                            i === 0 ? "bg-amber-100 text-amber-700" :
                            i === 1 ? "bg-gray-100 text-gray-600" :
                            i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"
                          )}>{i + 1}</span>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{b.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-emerald-700">{fmtMoney(b.ca)}</span>
                          <span className="text-xs text-gray-400 ml-1">FCFA</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A2E1C] rounded-full transition-all" style={{ width: `${pct}%` }} />
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
