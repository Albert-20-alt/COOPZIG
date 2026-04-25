import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";

type UploadResult = { name: string; status: "ok" | "error"; url?: string };

const BUCKET = "content-images";

const remapName = (originalName: string): string => {
  if (originalName.includes("66134")) return "papaye.jpg";
  if (originalName.includes("72682")) return "agrumes.jpg";
  if (originalName.includes("74477")) return "madd.jpg";
  if (originalName.includes("79019")) return "solom_branche.jpg";
  if (originalName.includes("82928")) return "solom_mains.jpg";
  return originalName;
};

export default function BotUploader() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <AlertCircle className="mr-2 w-5 h-5" />
          Accès réservé aux utilisateurs connectés.
        </div>
      </DashboardLayout>
    );
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setResults([]);
    const newResults: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const saveName = remapName(file.name);

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(saveName, file, { upsert: true, contentType: file.type });

      if (error) {
        newResults.push({ name: saveName, status: "error" });
        toast.error(`Erreur : ${saveName}`);
      } else {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
        newResults.push({ name: saveName, status: "ok", url: urlData.publicUrl });
      }
    }

    setResults(newResults);
    setUploading(false);
    const ok = newResults.filter(r => r.status === "ok").length;
    toast.success(`${ok} / ${newResults.length} fichier(s) uploadé(s)`);
    e.target.value = "";
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-12 px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Upload d'images</h1>
          <p className="text-sm text-gray-400 mt-1">
            Les fichiers sont uploadés dans le bucket Supabase <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{BUCKET}</code>.
          </p>
        </div>

        <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-colors
          ${uploading ? "border-gray-200 bg-gray-50 dark:bg-white/5" : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"}`}>
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-primary mb-2" />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Cliquer pour sélectionner</span>
              <span className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</span>
            </>
          )}
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>

        {results.length > 0 && (
          <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] divide-y divide-gray-50 dark:divide-[#1e2d45] overflow-hidden">
            {results.map((r) => (
              <div key={r.name} className="flex items-center gap-3 px-5 py-3">
                {r.status === "ok"
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{r.name}</span>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    Voir
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setResults([])}>
            Effacer les résultats
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}
