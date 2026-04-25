import { useState, useEffect } from "react";
import { FileText, Upload, Trash2, Loader2, File, ExternalLink, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useSiteConfig, useUpdateSiteConfig, useUploadSiteAsset } from "@/hooks/useSiteConfig";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PublicDocument = {
  id: string;
  name: string;
  url: string;
  date: string;
  size: string;
};

const GestionDocuments = () => {
  const { user } = useAuth();
  const { data: configs, isLoading: configsLoading } = useSiteConfig();
  const updateConfig = useUpdateSiteConfig();
  const uploadAsset = useUploadSiteAsset();
  const confirm = useConfirm();

  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  const { data: isSuperAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["isSuperAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" });
      const { data: adminData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data || adminData || false;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (configs) {
      const docConfig = configs.find(c => c.cle === "public_documents");
      if (docConfig && docConfig.valeur) {
        try {
          setDocuments(JSON.parse(docConfig.valeur));
        } catch {
          setDocuments([]);
        }
      }
    }
  }, [configs]);

  const saveDocuments = async (newDocs: PublicDocument[]) => {
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({ cle: "public_documents", valeur: JSON.stringify(newDocs) });
      toast.success("Documents mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Generate a clean filename for the bucket
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storageName = `doc_${Date.now()}_${cleanName}`;
    
    try {
      const url = await uploadAsset.mutateAsync({ file, fileName: storageName, configKey: "__temp__document__" });
      
      const newDoc: PublicDocument = {
        id: `doc_${Date.now()}`,
        name: file.name,
        url: url,
        date: new Date().toISOString().split('T')[0],
        size: (file.size / 1024 / 1024).toFixed(2) + " MB"
      };

      const updatedDocs = [...documents, newDoc];
      setDocuments(updatedDocs);
      await saveDocuments(updatedDocs);
      
    } catch (error) {
      toast.error("Échec du transfert du fichier");
    } finally {
      setIsUploading(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const removeDocument = (id: string) => {
    confirm({
      title: "Supprimer le document",
      description: "Le document ne sera plus disponible publiquement. Continuer ?",
      confirmLabel: "Supprimer",
      variant: "danger",
      onConfirm: async () => {
        const updatedDocs = documents.filter(d => d.id !== id);
        setDocuments(updatedDocs);
        await saveDocuments(updatedDocs);
      }
    });
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDocs.length / PAGE_SIZE);
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (roleLoading || configsLoading) {
    return (
      <DashboardLayout title="Documents Publics">
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Documents Publics">
        <div className="p-12 text-center bg-white dark:bg-[#0d1525] rounded-3xl border border-gray-100 dark:border-white/5 max-w-lg mx-auto shadow-xl shadow-black/5">
          <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <FileText className="text-amber-500" size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Accès restreint</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Vous n'avez pas les privilèges nécessaires pour gérer les documents publics.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Documents & Catalogues Publics" subtitle="Gérez les fichiers téléchargeables par vos clients">
      <div className="space-y-6">
        {/* ── Toolbar ────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <Input 
              placeholder="Rechercher un document..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-11 h-12 bg-white dark:bg-[#0d1525] border-gray-100 dark:border-[#1e2d45] rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Input type="file" id="doc-upload" onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" />
            <Label htmlFor="doc-upload" className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all bg-[#1A2E1C] dark:bg-emerald-800 text-white hover:bg-[#1A2E1C]/90 h-12 px-6 cursor-pointer shadow-lg shadow-emerald-900/20">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Nouveau Fichier
            </Label>
          </div>
        </div>

        {/* ── Documents List ──────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0d1525] rounded-3xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden transition-all">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.01]">
            <div>
               <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Catalogue & Archives</h3>
               <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Le premier document de la liste est le catalogue principal du site.</p>
            </div>
            {isSaving && <Loader2 className="animate-spin text-emerald-600" size={16} />}
          </div>

          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-24 px-6 group">
                 <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-white/[0.02] flex items-center justify-center mx-auto mb-6 border border-dashed border-gray-200 dark:border-white/10 group-hover:scale-110 transition-transform duration-500">
                   <File className="text-gray-300 dark:text-gray-600" size={32} />
                 </div>
                 <h3 className="text-sm font-bold text-gray-900 dark:text-white">Aucun document trouvé</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vos fichiers s'afficheront ici une fois importés.</p>
              </div>
            ) : (
              paginatedDocs.map((doc, index) => {
                const isMainCatalogue = index === 0 && currentPage === 1;
                return (
                  <div key={doc.id} className="group flex flex-col sm:flex-row items-center gap-5 p-5 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-all">
                    <div className={cn(
                      "flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 transition-transform group-hover:scale-105",
                      isMainCatalogue ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                    )}>
                      <FileText size={24} />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-base truncate">{doc.name}</h4>
                        {isMainCatalogue && (
                          <span className="w-fit mx-auto sm:mx-0 px-2 py-0.5 rounded-lg text-[9px] bg-amber-500 text-white font-black uppercase tracking-widest shadow-sm ring-1 ring-amber-600/10">
                            Catalogue Principal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-4 text-xs font-semibold text-gray-400">
                        <span className="flex items-center gap-1.5"><Plus size={10} /> {format(new Date(doc.date), "dd MMMM yyyy", { locale: fr })}</span>
                        <span className="flex items-center gap-1.5"><File size={10} /> {doc.size}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-[#1a2333] hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                        <a href={doc.url} target="_blank" rel="noreferrer" title="Aperçu">
                          <ExternalLink size={16} />
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => removeDocument(doc.id)} 
                        disabled={isSaving}
                        className="h-10 w-10 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-[#1a2333] text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all shadow-sm"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Pagination ────────────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="px-6 py-5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-white/[0.01]">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Index {(currentPage - 1) * PAGE_SIZE + 1} – {Math.min(currentPage * PAGE_SIZE, filteredDocs.length)} sur {filteredDocs.length} fichiers
              </div>
              
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a2333] text-gray-400 hover:text-emerald-600 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                  <Button
                    key={pg}
                    variant={currentPage === pg ? "default" : "outline"}
                    onClick={() => setCurrentPage(pg)}
                    className={cn(
                      "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                      currentPage === pg 
                        ? "bg-[#1A2E1C] dark:bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                        : "border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a2333] text-gray-500 hover:bg-gray-50 dark:hover:bg-white/10"
                    )}
                  >
                    {pg}
                  </Button>
                ))}

                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages} 
                  className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a2333] text-gray-400 hover:text-emerald-600 transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GestionDocuments;
