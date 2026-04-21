import { useState, useEffect } from "react";
import { FileText, Upload, Trash2, Loader2, File, ExternalLink, Plus } from "lucide-react";
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
        <div className="p-8 text-center bg-white rounded-xl shadow-sm max-w-lg mx-auto">
          <FileText className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-bold">Accès refusé</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Documents & Catalogues Publics" subtitle="Gérez les fichiers téléchargeables par vos clients">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
          <div>
             <h3 className="text-lg font-bold text-gray-900">Liste des documents</h3>
             <p className="text-sm text-gray-500 mt-1">Le premier document de cette liste est utilisé pour le bouton public "Télécharger le catalogue".</p>
          </div>
          <div>
            <Input type="file" id="doc-upload" onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" />
            <Label htmlFor="doc-upload" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 h-10 px-4 py-2 cursor-pointer shadow-sm">
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Nouveau Fichier
            </Label>
          </div>
        </div>

        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
               <File className="mx-auto text-gray-300 mb-3" size={32} />
               <p className="text-gray-500 font-medium text-sm">Aucun document n'a été publié.</p>
            </div>
          ) : (
            documents.map((doc, index) => (
              <div key={doc.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 truncate">{doc.name}</h4>
                    {index === 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold uppercase tracking-wide">
                        Catalogue Principal
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    <span>Ajouté le {doc.date}</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                  <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg shadow-sm border border-gray-200 transition-colors" title="Aperçu">
                    <ExternalLink size={16} />
                  </a>
                  <button onClick={() => removeDocument(doc.id)} className="p-2 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-gray-200 transition-colors" disabled={isSaving} title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GestionDocuments;
