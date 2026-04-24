import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog } from "@/hooks/useActivityLog";
import {
  Mail, Clock, CheckCircle2, Archive, ArchiveRestore,
  Reply, Trash2, Search, Send, Loader2, Bell, Download,
  Inbox, MailOpen, MailCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

type ContactMessage = {
  id: string;
  created_at: string;
  nom_complet: string;
  email: string;
  sujet: string;
  message: string;
  statut: "Nouvelle" | "Lue" | "Répondu" | "Archivée";
  reponse: string | null;
};

type NewsletterSub = {
  id: string;
  email: string;
  created_at: string;
};

type StatusFilter = "Toutes" | "Nouvelle" | "Lue" | "Répondu" | "Archivée";

const statutBadge: Record<string, string> = {
  Nouvelle:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Lue:       "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
  Répondu:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Archivée:  "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-500",
};

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-emerald-100 text-emerald-700",
    "bg-indigo-100 text-indigo-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Newsletter Tab ────────────────────────────────────────────────────────────
const NewsletterTab = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const confirm = useConfirm();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["newsletter-subscriptions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("newsletter_subscriptions")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsletterSub[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("newsletter_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletter-subscriptions"] });
      toast.success("Abonné supprimé");
    },
  });

  const filtered = subs.filter(s => s.email.toLowerCase().includes(search.toLowerCase()));

  const exportCsv = () => {
    const rows = ["Email,Date inscription", ...subs.map(s =>
      `${s.email},${format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}`
    )];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `newsletter_abonnés_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1e2d45] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Bell size={18} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Abonnés Newsletter</h2>
            <p className="text-xs text-gray-400">{subs.length} inscription{subs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              placeholder="Rechercher un email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 w-full sm:w-64 bg-gray-50 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-white/10 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={subs.length === 0} className="h-9 text-xs gap-1.5 shrink-0">
            <Download size={13} /> Exporter CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Bell size={40} className="mb-3 opacity-20" />
          <p className="text-sm">{search ? "Aucun résultat" : "Aucun abonné pour l'instant"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/[0.02] text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3 font-medium">#</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Date d'inscription</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {filtered.map((sub, i) => (
                <tr key={sub.id} className="group hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-3.5 text-xs text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", avatarColor(sub.email))}>
                        {sub.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{sub.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs text-gray-400">
                      {format(new Date(sub.created_at), "dd MMM yyyy · HH:mm", { locale: fr })}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                      onClick={() => confirm({
                        title: "Désinscrire l'abonné",
                        description: `Voulez-vous supprimer "${sub.email}" de la liste de diffusion ?`,
                        confirmLabel: "Supprimer", variant: "danger",
                        onConfirm: () => deleteMutation.mutate(sub.id),
                      })}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const AdminMessages = () => {
  const qc = useQueryClient();
  const logActivity = useActivityLog();
  const [tab, setTab] = useState<"messages" | "newsletter">("messages");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Toutes");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 30;

  const { data: allMessages = [] } = useQuery({
    queryKey: ["contact_messages_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages" as any)
        .select("id, statut")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as Pick<ContactMessage, "id" | "statut">[];
    },
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["contact_messages", page, searchQuery, statusFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("contact_messages")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (searchQuery) q = q.or(`nom_complet.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,sujet.ilike.%${searchQuery}%`);
      if (statusFilter !== "Toutes") q = q.eq("statut", statusFilter);
      const from = page * PAGE_SIZE;
      const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { messages: data as ContactMessage[], total: count || 0 };
    },
  });

  const messages = listData?.messages || [];
  const totalItems = listData?.total || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await (supabase as any).from("contact_messages").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact_messages"] });
      qc.invalidateQueries({ queryKey: ["contact_messages_all"] });
      qc.invalidateQueries({ queryKey: ["unread-messages-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact_messages"] });
      qc.invalidateQueries({ queryKey: ["contact_messages_all"] });
      qc.invalidateQueries({ queryKey: ["unread-messages-count"] });
      toast.success("Message supprimé");
      setSelectedMessage(null);
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, reponse }: { id: string; reponse: string }) => {
      const { error } = await (supabase as any).from("contact_messages").update({ reponse, statut: "Répondu" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["contact_messages"] });
      toast.success("Réponse enregistrée");
      setReplyText("");
      setSelectedMessage(prev => prev ? { ...prev, reponse: replyText, statut: "Répondu" } : null);
      logActivity.mutate({ action: "reply", module: "messages", entity_type: "message", entity_id: variables.id, label: "Réponse envoyée à un message client" });
    },
  });

  const handleSelectMessage = (m: ContactMessage) => {
    setSelectedMessage(m);
    setReplyText("");
    if (m.statut === "Nouvelle") {
      updateStatusMutation.mutate({ id: m.id, statut: "Lue" });
      setSelectedMessage({ ...m, statut: "Lue" });
    }
  };

  const counts = {
    Toutes:   allMessages.length,
    Nouvelle: allMessages.filter(m => m.statut === "Nouvelle").length,
    Lue:      allMessages.filter(m => m.statut === "Lue").length,
    Répondu:  allMessages.filter(m => m.statut === "Répondu").length,
    Archivée: allMessages.filter(m => m.statut === "Archivée").length,
  };

  const statusTabs: { key: StatusFilter; label: string; icon: any }[] = [
    { key: "Toutes",   label: "Toutes",    icon: Inbox },
    { key: "Nouvelle", label: "Nouvelles", icon: Mail },
    { key: "Lue",      label: "Lues",      icon: MailOpen },
    { key: "Répondu",  label: "Répondus",  icon: MailCheck },
    { key: "Archivée", label: "Archives",  icon: Archive },
  ];

  return (
    <DashboardLayout title="Messages & Communication" subtitle="Messages de contact et abonnés newsletter">
      <div className="space-y-4">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/[0.05] p-1 rounded-xl w-fit">
          {[
            { key: "messages" as const, icon: Mail, label: "Messages", badge: counts.Nouvelle },
            { key: "newsletter" as const, icon: Bell, label: "Newsletter" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                tab === t.key
                  ? "bg-white dark:bg-[#1e2d45] text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <t.icon size={15} />
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "newsletter" && <NewsletterTab />}

        {tab === "messages" && (
          <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-210px)]">

            {/* ── Left panel: list ──────────────────────────────────────── */}
            <div className="w-full md:w-[340px] shrink-0 flex flex-col bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] overflow-hidden">

              {/* Search */}
              <div className="px-4 pt-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    placeholder="Nom, email, sujet…"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                    className="pl-8 h-9 bg-gray-50 dark:bg-white/[0.04] border-transparent focus:bg-white dark:focus:bg-white/[0.08] text-sm rounded-lg"
                  />
                </div>
              </div>

              {/* Status filter pills */}
              <div className="flex gap-1 px-4 py-2 overflow-x-auto hide-scrollbar">
                {statusTabs.map(st => (
                  <button
                    key={st.key}
                    onClick={() => { setStatusFilter(st.key); setPage(0); }}
                    className={cn(
                      "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                      statusFilter === st.key
                        ? "bg-[#1A2E1C] dark:bg-emerald-900/40 text-white"
                        : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                    )}
                  >
                    <st.icon size={10} />
                    {st.label}
                    {counts[st.key] > 0 && (
                      <span className={cn(
                        "rounded-full text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center",
                        statusFilter === st.key ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                      )}>
                        {counts[st.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Message list */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-white/[0.04]">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={22} /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Inbox size={36} className="mb-3 opacity-30" />
                    <p className="text-xs">Aucun message trouvé</p>
                  </div>
                ) : messages.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMessage(m)}
                    className={cn(
                      "group relative px-4 py-3.5 cursor-pointer transition-colors",
                      selectedMessage?.id === m.id
                        ? "bg-emerald-50/60 dark:bg-emerald-900/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    )}
                  >
                    {m.statut === "Nouvelle" && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-10 bg-blue-500 rounded-r-full" />
                    )}

                    <div className="flex items-start gap-3">
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5", avatarColor(m.nom_complet))}>
                        {getInitials(m.nom_complet)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <span className={cn("text-sm truncate", m.statut === "Nouvelle" ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300")}>
                            {m.nom_complet}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0">{format(new Date(m.created_at), "dd MMM", { locale: fr })}</span>
                        </div>
                        <p className={cn("text-xs truncate mb-1", m.statut === "Nouvelle" ? "text-gray-800 dark:text-gray-200 font-semibold" : "text-gray-600 dark:text-gray-400")}>
                          {m.sujet}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{m.message}</p>
                      </div>
                    </div>

                    {/* Hover quick actions */}
                    <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.statut !== "Archivée" && (
                        <button
                          onClick={e => { e.stopPropagation(); updateStatusMutation.mutate({ id: m.id, statut: "Archivée" }); if (selectedMessage?.id === m.id) setSelectedMessage(null); }}
                          className="p-1 rounded-md bg-white dark:bg-[#1e2d45] border border-gray-200 dark:border-white/10 text-gray-400 hover:text-amber-500 hover:border-amber-200 transition-colors shadow-sm"
                          title="Archiver"
                        >
                          <Archive size={11} />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); confirm({ title: "Supprimer le message", description: `Supprimer définitivement ce message de "${m.nom_complet}" ?`, confirmLabel: "Supprimer", variant: "danger", onConfirm: () => deleteMutation.mutate(m.id) }); }}
                        className="p-1 rounded-md bg-white dark:bg-[#1e2d45] border border-gray-200 dark:border-white/10 text-gray-400 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm"
                        title="Supprimer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-2.5 border-t border-gray-100 dark:border-[#1e2d45] flex items-center justify-between">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 text-xs px-2">←</button>
                  <span className="text-xs text-gray-400">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 text-xs px-2">→</button>
                </div>
              )}
            </div>

            {/* ── Right panel: detail ───────────────────────────────────── */}
            <div className="flex-1 min-w-0 bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] overflow-hidden flex flex-col">
              {selectedMessage ? (
                <>
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1e2d45] shrink-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0", avatarColor(selectedMessage.nom_complet))}>
                          {getInitials(selectedMessage.nom_complet)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug truncate">
                            {selectedMessage.sujet}
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{selectedMessage.nom_complet}</span>
                            {" · "}
                            <span className="text-gray-400">{selectedMessage.email}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock size={11} className="text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {format(new Date(selectedMessage.created_at), "dd MMMM yyyy · HH:mm", { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", statutBadge[selectedMessage.statut])}>
                          {selectedMessage.statut}
                        </span>
                        {selectedMessage.statut !== "Archivée" ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => { updateStatusMutation.mutate({ id: selectedMessage.id, statut: "Archivée" }); setSelectedMessage({ ...selectedMessage, statut: "Archivée" }); }}
                            title="Archiver"
                          >
                            <Archive size={15} />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => { updateStatusMutation.mutate({ id: selectedMessage.id, statut: "Lue" }); setSelectedMessage({ ...selectedMessage, statut: "Lue" }); }}
                            title="Désarchiver"
                          >
                            <ArchiveRestore size={15} />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => confirm({
                            title: "Supprimer le message",
                            description: `Supprimer définitivement ce message de "${selectedMessage.nom_complet}" ?`,
                            confirmLabel: "Supprimer", variant: "danger",
                            onConfirm: () => deleteMutation.mutate(selectedMessage.id),
                          })}
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-5 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {selectedMessage.message}
                    </div>

                    {selectedMessage.reponse && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-px flex-1 bg-gray-100 dark:bg-white/[0.06]" />
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} /> Réponse envoyée
                          </span>
                          <div className="h-px flex-1 bg-gray-100 dark:bg-white/[0.06]" />
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {selectedMessage.reponse}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reply box */}
                  {!selectedMessage.reponse && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-[#1e2d45] bg-gray-50/50 dark:bg-black/10 shrink-0">
                      <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                        <Reply size={12} /> Répondre à {selectedMessage.nom_complet}
                      </Label>
                      <Textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Écrivez votre réponse…"
                        className="min-h-[100px] mb-3 bg-white dark:bg-[#0d1525] text-sm resize-none"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => replyMutation.mutate({ id: selectedMessage.id, reponse: replyText })}
                          disabled={!replyText.trim() || replyMutation.isPending}
                          className="bg-[#1A2E1C] dark:bg-emerald-800 text-white hover:bg-[#1A2E1C]/90 gap-2"
                        >
                          {replyMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                          Envoyer la réponse
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center mb-1">
                    <Mail size={28} className="text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sélectionnez un message</p>
                  <p className="text-xs text-gray-400">Cliquez sur un message à gauche pour le lire</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminMessages;
