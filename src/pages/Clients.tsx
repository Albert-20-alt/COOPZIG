import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Search, TrendingUp, ShoppingCart, Wallet,
  Phone, Building2, Clock, Star, ChevronRight, Mail,
  Package, ChevronLeft, X, LayoutGrid, Activity
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────
type ClientRow = {
  user_id: string;
  full_name: string;
  entreprise: string | null;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  last_order: string | null;
  pending: number;
  delivered: number;
};

type OrderRow = {
  id: string;
  produit_nom: string;
  quantite: number;
  unite: string;
  montant: number;
  statut: string;
  created_at: string;
};

// ─── Status pill ──────────────────────────────────────────────────────────────
const STATUS: Record<string, string> = {
  "En attente":  "bg-amber-50 text-amber-700",
  "Confirmée":   "bg-blue-50 text-blue-700",
  "En cours":    "bg-purple-50 text-purple-700",
  "Livrée":      "bg-emerald-50 text-emerald-700",
  "Annulée":     "bg-red-50 text-red-700",
};

const fmt = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: fr });
const fmtMoney = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

// ─── Client detail modal ──────────────────────────────────────────────────────
const ClientModal = ({ client, open, onOpenChange }: { client: ClientRow; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["client-orders", client.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commandes")
        .select("id, produit_nom, quantite, unite, montant, statut, created_at")
        .eq("acheteur_id", client.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden flex flex-col h-[85vh]">
        {/* Header - Premium Quantum Style */}
        <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl font-black text-emerald-400 shadow-2xl">
              {(client.full_name || "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white tracking-tight">{client.full_name || "—"}</DialogTitle>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {client.entreprise && (
                  <p className="text-sm font-medium text-white/50 flex items-center gap-1.5">
                    <Building2 size={14} className="text-emerald-500" /> {client.entreprise}
                  </p>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 underline decoration-emerald-400/30 underline-offset-4">
                    <Phone size={14} /> {client.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Client Score / VIP Stats */}
        <div className="grid grid-cols-3 gap-6 px-8 py-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
          {[
            { label: "Volume Commandes", value: client.total_orders, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Chiffre d'Affaires", value: fmtMoney(client.total_spent), icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Statut Actif", value: client.pending > 0 ? "En cours" : "À jour", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex flex-col items-center">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm border border-black/5", bg)}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} /> Historique Institutionnel
            </h3>
            <Badge variant="outline" className="text-[10px] font-bold h-5 bg-gray-50 text-gray-500 border-gray-200">
              {orders.length} Opérations
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
              <p className="text-sm font-medium text-gray-400">Synchronisation des registres...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-gray-400 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-dashed border-gray-200">
                <Package size={28} className="opacity-20" />
              </div>
              <p className="text-sm font-medium">Aucun mouvement comptable indexé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                      <Package size={18} className="text-gray-400 group-hover:text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{o.produit_nom}</p>
                      <p className="text-xs text-gray-400 font-medium">{o.quantite} {o.unite} · <span className="text-gray-400/60 uppercase tracking-tighter">{fmt(o.created_at)}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:block">
                      <p className="text-sm font-black text-gray-900">{fmtMoney(o.montant)}</p>
                      <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter", STATUS[o.statut] || "bg-gray-100 text-gray-600")}>
                        {o.statut}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Signature Digitale Certifiée CRPAZ</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Clients = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"spent" | "orders" | "recent">("spent");
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // Fetch all commandes with profile data
  const { data: rawCommandes = [], isLoading } = useQuery({
    queryKey: ["crm-commandes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commandes")
        .select("acheteur_id, montant, statut, created_at")
        .eq("est_precommande", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Aggregate by client
  const clients: ClientRow[] = useMemo(() => {
    const map = new Map<string, ClientRow>();
    for (const c of rawCommandes as any[]) {
      const uid = c.acheteur_id;
      if (!uid) continue;
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      if (!map.has(uid)) {
        map.set(uid, {
          user_id: uid,
          full_name: profile?.full_name || "Client inconnu",
          entreprise: profile?.entreprise || null,
          phone: profile?.phone || null,
          total_orders: 0,
          total_spent: 0,
          last_order: null,
          pending: 0,
          delivered: 0,
        });
      }
      const row = map.get(uid)!;
      row.total_orders += 1;
      row.total_spent += Number(c.montant || 0);
      if (!row.last_order || c.created_at > row.last_order) row.last_order = c.created_at;
      if (c.statut === "En attente" || c.statut === "Confirmée" || c.statut === "En cours") row.pending += 1;
      if (c.statut === "Livrée") row.delivered += 1;
    }
    return Array.from(map.values());
  }, [rawCommandes]);

  // Filter + sort
  const visible = useMemo(() => {
    let list = clients.filter(c =>
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.entreprise || "").toLowerCase().includes(search.toLowerCase())
    );
    if (sort === "spent")  list = [...list].sort((a, b) => b.total_spent - a.total_spent);
    if (sort === "orders") list = [...list].sort((a, b) => b.total_orders - a.total_orders);
    if (sort === "recent") list = [...list].sort((a, b) => (b.last_order || "").localeCompare(a.last_order || ""));
    return list;
  }, [clients, search, sort]);

  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const pageClients = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Global stats
  const totalCA  = clients.reduce((s, c) => s + c.total_spent, 0);
  const avgSpend = clients.length ? Math.round(totalCA / clients.length) : 0;
  const topClient = [...clients].sort((a, b) => b.total_spent - a.total_spent)[0];

  return (
    <DashboardLayout title="CRM Clients" subtitle="Répertoire acheteurs et historique des achats">
      <div className="space-y-8">

        {/* KPI cards - Premium Quantum Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Clients Actifs",   value: clients.length,         icon: Users,        color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "CA Global",        value: fmtMoney(totalCA),      icon: Wallet,       color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Panier Moyen",     value: fmtMoney(avgSpend),     icon: TrendingUp,   color: "text-purple-600",  bg: "bg-purple-50" },
            { label: "Ambassadeur",      value: topClient?.full_name || "—", icon: Star,    color: "text-amber-600",   bg: "bg-amber-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-all group">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-black/5 group-hover:scale-110 transition-transform", bg)}>
                <Icon size={24} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-black text-gray-900 truncate tracking-tight">{value}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher par identité ou entreprise…"
              className="w-full pl-12 pr-4 h-12 text-sm border-none bg-transparent focus-visible:ring-0 font-medium"
            />
          </div>
          <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl w-full sm:w-auto">
            {(["spent", "orders", "recent"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "flex-1 sm:flex-none px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-[1.25rem] transition-all",
                  sort === s ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/20" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                )}
              >
                {{ spent: "Par CA", orders: "Fréquence", recent: "Récence" }[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Client table - Premium Quantum Design */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <LayoutGrid size={16} className="text-emerald-600" /> Répertoire des Registres
            </h3>
            <span className="text-xs font-bold text-gray-400">
              {visible.length} Identités Indexées
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16 text-sm text-gray-400">Chargement…</div>
          ) : pageClients.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <Users size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Aucun client trouvé</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400">
                      <th className="px-4 py-2 font-medium">Client</th>
                      <th className="px-4 py-2 font-medium">Entreprise</th>
                      <th className="px-4 py-2 font-medium">Commandes</th>
                      <th className="px-4 py-2 font-medium">CA total</th>
                      <th className="px-4 py-2 font-medium">En cours</th>
                      <th className="px-4 py-2 font-medium">Dernière commande</th>
                      <th className="px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageClients.map(c => (
                      <tr
                        key={c.user_id}
                        className="border-b border-gray-50 hover:bg-emerald-50/30 cursor-pointer transition-all group"
                        onClick={() => setSelected(c)}
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-black/5 flex items-center justify-center text-sm font-black text-gray-500 shrink-0 group-hover:bg-white group-hover:text-emerald-600 group-hover:shadow-sm transition-all uppercase tracking-tighter">
                              {(c.full_name || "?").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 leading-tight">{c.full_name}</p>
                              {c.phone && <p className="text-[11px] font-medium text-gray-400 mt-0.5">{c.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-gray-600">{c.entreprise || "—"}</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm font-black text-gray-900">{c.total_orders}</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm font-black text-emerald-700">{fmtMoney(c.total_spent)}</span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          {c.pending > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                              {c.pending} ACTIF
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-gray-300">Aucun</span>
                          )}
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">
                            {c.last_order ? fmt(c.last_order) : "—"}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all inline-block" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination - Premium Quantum Design */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-8 py-4 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    Index {page * PAGE_SIZE + 1} – {Math.min((page + 1) * PAGE_SIZE, visible.length)} sur {visible.length}
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setPage(p => Math.max(0, p - 1))} 
                      disabled={page === 0}
                      className="h-9 w-9 rounded-xl border-gray-200 p-0 hover:bg-white transition-all shadow-sm disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} 
                      disabled={page >= totalPages - 1}
                      className="h-9 w-9 rounded-xl border-gray-200 p-0 hover:bg-white transition-all shadow-sm disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Premium Detail Modal */}
      {selected && (
        <ClientModal 
          client={selected} 
          open={!!selected} 
          onOpenChange={(v) => !v && setSelected(null)} 
        />
      )}
    </DashboardLayout>
  );
};

export default Clients;
