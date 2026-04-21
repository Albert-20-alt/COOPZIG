import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog } from "@/hooks/useActivityLog";
import {
  Mail, Clock, CheckCircle2, Archive,
  Reply, Trash2, Search, Send, Loader2, User, Bell, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  statut: 'Nouvelle' | 'Lue' | 'Répondu' | 'Archivée';
  reponse: string | null;
};

type NewsletterSub = {
  id: string;
  email: string;
  created_at: string;
};

const statutConfig: Record<string, { label: string; bg: string; text: string }> = {
  Nouvelle:  { label: "Nouvelle",  bg: "bg-blue-50 text-blue-700", text: "border-blue-200" },
  Lue:       { label: "Lue",       bg: "bg-gray-100 text-gray-700", text: "border-gray-200" },
  Répondu:   { label: "Répondu",   bg: "bg-emerald-50 text-emerald-700", text: "border-emerald-200" },
  Archivée:  { label: "Archivée",  bg: "bg-slate-100 text-slate-700", text: "border-slate-200" },
};

// ─── Newsletter Tab ─────────────────────────────────────────────────────────
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
      const { error } = await (supabase as any)
        .from("newsletter_subscriptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletter-subscriptions"] });
      toast.success("Abonné supprimé");
    },
  });

  const filtered = subs.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const rows = ["Email,Date inscription", ...subs.map(s =>
      `${s.email},${format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}`
    )];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter_abonnés_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Bell size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Abonnés Newsletter</h2>
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
              className="pl-8 h-9 w-full sm:w-64 bg-gray-50 border-transparent focus:bg-white text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={subs.length === 0}
            className="h-9 text-xs gap-1.5 shrink-0"
          >
            <Download size={13} /> Exporter CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gray-300" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Bell size={36} className="mb-3 opacity-30" />
          <p className="text-sm">{search ? "Aucun résultat pour cette recherche" : "Aucun abonné pour l'instant"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-5 py-2.5 font-medium">#</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Date d'inscription</th>
                <th className="px-5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub, i) => (
                <tr key={sub.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-gray-800 font-medium">{sub.email}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-gray-500">
                      {format(new Date(sub.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                       onClick={() => {
                         confirm({
                           title: "Désinscrire l'abonné",
                           description: `Voulez-vous supprimer l'adresse "${sub.email}" de la liste de diffusion ?`,
                           confirmLabel: "Supprimer",
                           variant: "danger",
                           onConfirm: () => deleteMutation.mutate(sub.id),
                         });
                       }}
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

// ─── Main Component ──────────────────────────────────────────────────────────
const AdminMessages = () => {
  const qc = useQueryClient();
  const logActivity = useActivityLog();
  const [tab, setTab] = useState<"messages" | "newsletter">("messages");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const PAGE_SIZE = 20;

  const { data: allMessages = [] } = useQuery({
    queryKey: ["contact_messages_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages" as any)
        .select("id, statut")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pick<ContactMessage, "id" | "statut">[];
    },
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["contact_messages", page, searchQuery],
    queryFn: async () => {
      let q = (supabase as any)
        .from("contact_messages")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (searchQuery) {
        q = q.or(`nom_complet.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,sujet.ilike.%${searchQuery}%`);
      }
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
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
      toast.success("Message supprimé");
      setSelectedMessage(null);
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, reponse }: { id: string; reponse: string }) => {
      const { error } = await (supabase as any).from("contact_messages").update({ reponse, statut: 'Répondu' }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["contact_messages"] });
      toast.success("Réponse envoyée");
      setReplyText("");
      logActivity.mutate({ action: "reply", module: "messages", entity_type: "message", entity_id: variables.id, label: "Réponse envoyée à un message client" });
    },
  });

  const handleSelectMessage = (m: ContactMessage) => {
    setSelectedMessage(m);
    if (m.statut === 'Nouvelle') updateStatusMutation.mutate({ id: m.id, statut: 'Lue' });
  };

  const unreadCount = allMessages.filter(m => m.statut === 'Nouvelle').length;

  return (
    <DashboardLayout title="Messages & Communication" subtitle="Messages de contact et abonnés newsletter">
      <div className="space-y-4">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab("messages")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === "messages"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Mail size={15} />
            Messages
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("newsletter")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === "newsletter"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Bell size={15} />
            Newsletter
          </button>
        </div>

        {/* Newsletter tab */}
        {tab === "newsletter" && <NewsletterTab />}

        {/* Messages tab */}
        {tab === "messages" && (
          <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-220px)]">

            {/* Sidebar: Message List */}
            <div className="w-full md:w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        Boîte de réception {unreadCount > 0 && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">{unreadCount}</Badge>}
                     </h2>
                  </div>
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                     <Input
                       placeholder="Rechercher..."
                       value={searchQuery}
                       onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                       className="pl-9 h-10 bg-gray-50 border-transparent focus:bg-white"
                     />
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                     <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
                  ) : messages.length === 0 ? (
                     <div className="text-center p-8 text-gray-500 text-sm">Aucun message trouvé.</div>
                  ) : (
                     <div className="divide-y divide-gray-100">
                        {messages.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMessage(m)}
                            className={cn(
                              "p-4 cursor-pointer transition-colors relative hover:bg-gray-50",
                              selectedMessage?.id === m.id ? "bg-blue-50/50" : "",
                              m.statut === "Nouvelle" ? "font-bold text-gray-900 bg-white" : "text-gray-600 bg-white"
                            )}
                          >
                             {m.statut === "Nouvelle" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r" />}
                             <div className="flex justify-between items-start mb-1 px-1">
                                <h4 className="text-sm line-clamp-1">{m.nom_complet}</h4>
                                <span className="text-xs text-gray-400 shrink-0 ml-2">{format(new Date(m.created_at), "dd MMM", { locale: fr })}</span>
                             </div>
                             <p className="text-xs font-semibold mb-1 truncate px-1">{m.sujet}</p>
                             <p className={cn("text-xs line-clamp-1 px-1", m.statut === "Nouvelle" ? "text-gray-700" : "text-gray-500")}>{m.message}</p>
                          </div>
                        ))}
                     </div>
                  )}
               </div>

               {/* Pagination */}
               {totalPages > 1 && (
                 <div className="p-3 border-t border-gray-100 flex items-center justify-between">
                   <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                     <span className="text-xs px-1">←</span>
                   </button>
                   <span className="text-xs text-gray-400">{page + 1} / {totalPages}</span>
                   <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                     <span className="text-xs px-1">→</span>
                   </button>
                 </div>
               )}
            </div>

            {/* Main Area: Message Detail */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
               {selectedMessage ? (
                  <>
                     {/* Detail Header */}
                     <div className="p-6 border-b border-gray-100 shrink-0">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedMessage.sujet}</h2>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                 <User size={14} /> <strong>{selectedMessage.nom_complet}</strong>
                                 <span className="text-gray-400">&lt;{selectedMessage.email}&gt;</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                 <Clock size={12} /> {format(new Date(selectedMessage.created_at), "dd MMMM yyyy HH:mm", { locale: fr })}
                              </div>
                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className={cn("font-medium", statutConfig[selectedMessage.statut].bg, statutConfig[selectedMessage.statut].text)}>
                                 {statutConfig[selectedMessage.statut].label}
                              </Badge>
                               <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: selectedMessage.id, statut: 'Archivée' })} aria-label="Archiver"><Archive size={16}/></Button>
                               <Button variant="ghost" size="icon" onClick={() => {
                                 confirm({
                                   title: "Supprimer le message",
                                   description: `Voulez-vous supprimer définitivement ce message de "${selectedMessage.nom_complet}" ?`,
                                   confirmLabel: "Supprimer",
                                   variant: "danger",
                                   onConfirm: () => deleteMutation.mutate(selectedMessage.id),
                                 });
                               }} className="text-rose-500 hover:bg-rose-50 hover:text-rose-600" aria-label="Supprimer"><Trash2 size={16}/></Button>
                            </div>
                        </div>
                     </div>

                     {/* Message Body */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                           {selectedMessage.message}
                        </div>
                        {selectedMessage.reponse && (
                           <div className="mt-8 ml-8 bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-blue-800">
                                 <Reply size={16} /> Réponse envoyée
                              </div>
                              <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                                 {selectedMessage.reponse}
                              </div>
                           </div>
                        )}
                     </div>

                     {/* Reply Box */}
                     {!selectedMessage.reponse && (
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 shrink-0">
                           <Label className="text-sm font-medium text-gray-700 mb-2 block">Répondre</Label>
                           <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Écrivez votre réponse..."
                              className="min-h-[100px] mb-3 bg-white"
                           />
                           <div className="flex justify-end">
                              <Button
                                 onClick={() => replyMutation.mutate({ id: selectedMessage.id, reponse: replyText })}
                                 disabled={!replyText.trim() || replyMutation.isPending}
                                 className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90"
                              >
                                 {replyMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send size={16} className="mr-2" />}
                                 Envoyer la réponse
                              </Button>
                           </div>
                        </div>
                     )}
                  </>
               ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                     <Mail size={48} className="mb-4 text-gray-300" />
                     <p className="text-sm font-medium">Sélectionnez un message pour le lire</p>
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
