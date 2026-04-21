import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type Note = {
  id: string;
  content: string;
  author_name: string | null;
  author_id: string | null;
  created_at: string;
};

type Props = {
  entityType: "commande" | "demande" | "client";
  entityId: string;
};

const EntityNotes = ({ entityType, entityId }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["entity-notes", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("entity_notes" as any) as any)
        .select("id, content, author_name, author_id, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Note[];
    },
    enabled: open && !!entityId,
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Non connecté");
      const { error } = await (supabase.from("entity_notes" as any) as any).insert({
        entity_type: entityType,
        entity_id: entityId,
        content,
        author_id: user.id,
        author_name: user.user_metadata?.full_name || user.email,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity-notes", entityType, entityId] });
      setText("");
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("entity_notes" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entity-notes", entityType, entityId] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    addNote.mutate(trimmed);
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <MessageSquare size={14} className="text-gray-400" />
          Notes internes
          {notes.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#1A2E1C] text-white text-[9px] font-bold">
              {notes.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <div className="bg-white">
          {/* Notes list */}
          <div className="max-h-56 overflow-y-auto px-4 py-3 space-y-3">
            {isLoading ? (
              <p className="text-xs text-gray-400 text-center py-4">Chargement…</p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Aucune note. Soyez le premier.</p>
            ) : (
              notes.map(note => (
                <div key={note.id} className="group flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1A2E1C]/10 flex items-center justify-center text-[9px] font-bold text-[#1A2E1C] shrink-0 mt-0.5">
                    {(note.author_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-semibold text-gray-700 truncate">{note.author_name || "Inconnu"}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {format(parseISO(note.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  {note.author_id === user?.id && (
                    <button
                      onClick={() => deleteNote.mutate(note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 px-4 pb-3 pt-1 border-t border-gray-50">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
              rows={1}
              placeholder="Ajouter une note… (Entrée pour envoyer)"
              className="flex-1 resize-none text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A2E1C]/20 min-h-[36px]"
            />
            <button
              type="submit"
              disabled={!text.trim() || addNote.isPending}
              className="p-2 bg-[#1A2E1C] text-white rounded-lg hover:bg-[#1A2E1C]/90 disabled:opacity-40 transition-colors shrink-0"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default EntityNotes;
