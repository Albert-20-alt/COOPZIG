import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  MessageSquare, Send, Inbox, ArrowUpRight, Plus, X, Search,
  ChevronRight, MailOpen, Trash2, User,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type Message = {
  id: string;
  from_user_id: string | null;
  from_name: string | null;
  to_user_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  deleted_by_sender: boolean;
  deleted_by_recipient: boolean;
  created_at: string;
};

type Profile = {
  user_id: string;
  full_name: string;
};

function timeAgo(iso: string) {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: fr }); }
  catch { return iso; }
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const s = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${s} rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0`}>
      {initials || <User size={14} />}
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [selected, setSelected] = useState<Message | null>(null);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ to_user_id: "", subject: "", body: "" });

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["messages-internes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages_internes" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles-for-messaging"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("user_id, full_name")
        .neq("user_id", user!.id);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const inbox = useMemo(
    () => messages.filter((m) => m.to_user_id === user?.id && !m.deleted_by_recipient),
    [messages, user]
  );
  const sent = useMemo(
    () => messages.filter((m) => m.from_user_id === user?.id && !m.deleted_by_sender),
    [messages, user]
  );

  const displayList = (tab === "inbox" ? inbox : sent).filter((m) =>
    search === "" ||
    m.subject.toLowerCase().includes(search.toLowerCase()) ||
    m.body.toLowerCase().includes(search.toLowerCase()) ||
    (m.from_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = inbox.filter((m) => !m.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("messages_internes" as any).update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages-internes"] }),
  });

  const deleteMsg = useMutation({
    mutationFn: async ({ id, field }: { id: string; field: string }) => {
      const { error } = await supabase
        .from("messages_internes" as any)
        .update({ [field]: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages-internes"] });
      setSelected(null);
      toast.success("Message supprimé");
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  const sendMsg = useMutation({
    mutationFn: async () => {
      if (!form.to_user_id || !form.subject.trim() || !form.body.trim()) {
        throw new Error("Destinataire, sujet et message sont requis");
      }
      const myProfile = await supabase.from("profiles" as any).select("full_name").eq("user_id", user!.id).single();
      const myName = (myProfile.data as any)?.full_name ?? user?.email ?? "Inconnu";
      const { error } = await supabase.from("messages_internes" as any).insert({
        from_user_id: user!.id,
        from_name: myName,
        to_user_id: form.to_user_id,
        subject: form.subject,
        body: form.body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages-internes"] });
      toast.success("Message envoyé");
      setComposing(false);
      setForm({ to_user_id: "", subject: "", body: "" });
      setTab("sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openMessage = (msg: Message) => {
    setSelected(msg);
    if (!msg.is_read && msg.to_user_id === user?.id) {
      markRead.mutate(msg.id);
    }
  };

  const profileName = (p: Profile) => p.full_name || "Utilisateur";

  return (
    <DashboardLayout title="Messagerie interne">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col" style={{ height: "calc(100vh - 72px)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare size={24} className="text-emerald-600" />
              Messagerie interne
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Communiquez avec les membres de la coopérative</p>
          </div>
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A2E1C] text-white text-sm font-semibold hover:bg-[#1A2E1C]/90 transition-colors"
          >
            <Plus size={16} />
            Nouveau message
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-hidden">
          {/* Left panel: list */}
          <div className="flex flex-col bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-[#1e2d45]">
              {([
                { id: "inbox", label: "Boîte de réception", icon: Inbox, badge: unreadCount },
                { id: "sent",  label: "Envoyés",            icon: ArrowUpRight },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setSelected(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
                    tab === t.id
                      ? "text-emerald-700 border-b-2 border-emerald-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <t.icon size={13} />
                  {t.label}
                  {"badge" in t && (t.badge ?? 0) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-[#1e2d45]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.04]">
                <Search size={13} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="flex-1 text-xs bg-transparent focus:outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-[#1e2d45]/50">
              {isLoading ? (
                <p className="text-xs text-gray-400 p-4">Chargement…</p>
              ) : displayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <MessageSquare size={28} className="opacity-30 mb-2" />
                  <p className="text-xs">Aucun message</p>
                </div>
              ) : (
                displayList.map((msg) => {
                  const isUnread = !msg.is_read && msg.to_user_id === user?.id;
                  const isActive = selected?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex items-stretch hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors ${
                        isActive ? "bg-emerald-50 dark:bg-emerald-900/10" : ""
                      }`}
                    >
                      <button
                        onClick={() => openMessage(msg)}
                        className="flex-1 text-left px-4 py-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <Avatar name={msg.from_name ?? "?"} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs truncate ${isUnread ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                                {tab === "inbox" ? (msg.from_name ?? "Inconnu") : "À: " + (profiles.find(p => p.user_id === msg.to_user_id) ? profileName(profiles.find(p => p.user_id === msg.to_user_id)!) : msg.to_user_id)}
                              </p>
                              <p className="text-[10px] text-gray-400 shrink-0">{timeAgo(msg.created_at)}</p>
                            </div>
                            <p className={`text-xs truncate ${isUnread ? "font-semibold text-gray-800 dark:text-gray-200" : "text-gray-600 dark:text-gray-400"}`}>
                              {msg.subject}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{msg.body}</p>
                          </div>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMsg.mutate({
                            id: msg.id,
                            field: tab === "inbox" ? "deleted_by_recipient" : "deleted_by_sender",
                          });
                        }}
                        className="px-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-gray-300 hover:text-red-500"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: message detail */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0d1525] rounded-2xl border border-gray-100 dark:border-[#1e2d45] overflow-hidden flex flex-col">
            {selected ? (
              <>
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1e2d45]">
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.from_name ?? "?"} />
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selected.subject}</p>
                      <p className="text-xs text-gray-500">
                        De : {selected.from_name ?? "Inconnu"} · {timeAgo(selected.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => deleteMsg.mutate({
                        id: selected.id,
                        field: tab === "inbox" ? "deleted_by_recipient" : "deleted_by_sender",
                      })}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                      <X size={14} className="text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-5 overflow-y-auto">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selected.body}
                  </p>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 dark:border-[#1e2d45] flex items-center gap-2">
                  <MailOpen size={13} className="text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {selected.is_read ? "Lu" : "Non lu"} · Reçu {timeAgo(selected.created_at)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <MessageSquare size={40} className="opacity-20 mb-3" />
                <p className="text-sm font-medium">Sélectionnez un message</p>
                <p className="text-xs mt-1">ou rédigez un nouveau message</p>
                <button
                  onClick={() => setComposing(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A2E1C] text-white text-sm font-semibold hover:bg-[#1A2E1C]/90 transition-colors"
                >
                  <Plus size={14} />
                  Nouveau message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose modal */}
      {composing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0d1525] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1e2d45]">
              <p className="font-bold text-gray-900 dark:text-gray-100">Nouveau message</p>
              <button onClick={() => setComposing(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Destinataire *</label>
                <select
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.to_user_id}
                  onChange={(e) => setForm((f) => ({ ...f, to_user_id: e.target.value }))}
                >
                  <option value="">Choisir un destinataire…</option>
                  {profiles.map((p) => (
                    <option key={p.user_id} value={p.user_id}>{profileName(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Sujet *</label>
                <input
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Sujet du message"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Message *</label>
                <textarea
                  rows={6}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#1e2d45] bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Votre message…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setComposing(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-[#1e2d45] text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                >
                  Annuler
                </button>
                <button
                  onClick={() => sendMsg.mutate()}
                  disabled={sendMsg.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1A2E1C] text-white text-sm font-semibold hover:bg-[#1A2E1C]/90 disabled:opacity-50"
                >
                  <Send size={14} />
                  {sendMsg.isPending ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
