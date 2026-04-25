import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  ShoppingBag, Plus, Pencil, Trash2, 
  Loader2, Image as ImageIcon, ExternalLink,
  Search, Package, Filter, Zap, Star, MapPin, Calendar as CalendarIcon, Scale, Upload, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, cn } from "@/lib/utils";
import { useRef } from "react";
import { useConfirm } from "@/components/ConfirmDialog";

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("content-images").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("content-images").getPublicUrl(path);
  return data.publicUrl;
}

const CatalogueProduits = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduit, setEditingProduit] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [filterCategorie, setFilterCategorie] = useState("all");

  const categories = ["Fruits", "Céréales", "Riz", "Noix", "Oléagineux", "Légumes", "Autre"];

  const [formData, setFormData] = useState({
    nom: "",
    variete: "",
    zone_production: "",
    saison: "",
    quantite_estimee: 0,
    norme_qualite: "Export",
    description: "",
    photo_url: "",
    prix_coop: 0,
    prix_marche: 0,
    categorie: "Fruits",
    in_ecommerce: true
  });

  const { data: produits = [], isLoading } = useQuery({
    queryKey: ["produits-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produits").select("*").order("nom");
      if (error) throw error;
      return data;
    }
  });

  // Background injector for fulfilling User's request to insert High Quality images
  const injectImages = async () => {
      if (produits.length === 0) return;
      const imagesToInsert = [
        { nom: "Papaye Solo", photo_url: "/images/catalog/papaye.jpg" },
        { nom: "Agrumes de Casamance", photo_url: "/images/catalog/agrumes.jpg" },
        { nom: "Solom (Dialium guineense)", variete: "Fruit Sauvage", photo_url: "/images/catalog/solom_mains.jpg", zone_production: "Casamance", saison: "Juin - Août", quantite_estimee: 5, norme_qualite: "Local", description: "Le Solom velouté, cueilli à la main dans les forêts du sud. Goût acidulé." },
        { nom: "Madd (Saba senegalensis)", variete: "Liane Sauvage", photo_url: "/images/catalog/madd.jpg", zone_production: "Forêt Classée", saison: "Mai - Juillet", quantite_estimee: 10, norme_qualite: "Local", description: "Fruit exquis de Casamance, idéal pour les jus et sirops." },
      ];

      for (const item of imagesToInsert) {
        const existing = produits.find((p: any) => p.nom === item.nom);
        if (existing) {
          if (existing.photo_url && !existing.photo_url.includes("images.unsplash.com")) continue; // skip if already has a non-unsplash image (to not overwrite user uploads)
          await supabase.from("produits").update({ photo_url: item.photo_url }).eq("id", existing.id);
        } else {
          await supabase.from("produits").insert([item]);
        }
      }
  };

  useEffect(() => {
    injectImages();
  }, [produits.length]);

  const handleOpenDialog = (produit?: any) => {
    if (produit) {
      setEditingProduit(produit);
      setFormData({
        nom: produit.nom || "",
        variete: produit.variete || "",
        zone_production: produit.zone_production || "",
        saison: produit.saison || "",
        quantite_estimee: produit.quantite_estimee || 0,
        norme_qualite: produit.norme_qualite || "Export",
        description: produit.description || "",
        photo_url: produit.photo_url || "",
        prix_coop: produit.prix_coop || 0,
        prix_marche: produit.prix_marche || 0,
        categorie: produit.categorie || "Fruits",
        in_ecommerce: produit.in_ecommerce !== false
      });
    } else {
      setEditingProduit(null);
      setFormData({
        nom: "",
        variete: "",
        zone_production: "",
        saison: "",
        quantite_estimee: 0,
        norme_qualite: "Export",
        description: "",
        photo_url: "",
        prix_coop: 0,
        prix_marche: 0,
        categorie: "Fruits",
        in_ecommerce: true
      });
    }
    setIsDialogOpen(true);
  };

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof formData) => {
      if (editingProduit) {
        const { error } = await supabase
          .from("produits")
          .update(values)
          .eq("id", editingProduit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("produits")
          .insert([values]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produits-admin"] });
      queryClient.invalidateQueries({ queryKey: ["produits-public"] });
      toast.success(editingProduit ? "Produit mis à jour" : "Produit ajouté au catalogue");
      setIsDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produits-admin"] });
      queryClient.invalidateQueries({ queryKey: ["produits-public"] });
      toast.success("Produit retiré du catalogue");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez choisir une image.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setFormData((f) => ({ ...f, photo_url: url }));
      toast.success("Image importée avec succès !");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const filteredProduits = produits.filter(p => 
    (p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (p.variete && p.variete.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (filterCategorie === "all" || p.categorie === filterCategorie)
  );

  const totalPages = Math.max(1, Math.ceil(filteredProduits.length / itemsPerPage));
  const paginatedProduits = filteredProduits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Catalogue Produits" subtitle="Gestion des produits affichés sur le site public">
      <div className="space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131d2e] p-6 rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Registre du Catalogue</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestion des références commerciales et e-commerce.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 h-11 px-6 rounded-xl shadow-lg shadow-emerald-900/10">
             <Plus className="mr-2" size={18} /> Nouveau Produit
          </Button>
        </div>

        {/* Search & Filters - Quantum Standard */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col xl:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input
              placeholder="Rechercher un produit ou une variété..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 p-1">
            <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto max-w-[600px]">
              {[
                { id: "all", label: "Tous" },
                ...categories.map(c => ({ id: c, label: c }))
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setFilterCategorie(s.id); setCurrentPage(1); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    filterCategorie === s.id
                      ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                      : "text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-white/5"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid Display */}
        {isLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
        ) : filteredProduits.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
             <Package className="mx-auto text-gray-300 mb-4" size={48} />
             <h3 className="text-lg font-bold text-gray-900">Aucun produit trouvé</h3>
             <p className="text-gray-500 max-w-xs mx-auto mt-2">Commencez par ajouter votre premier produit au catalogue public.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {paginatedProduits.map((p) => {
              // Sanitize season display (prevent duplicates and malformed strings)
              const cleanSaison = (p.saison || "")
                .split(/[\s-]+/)
                .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
                .join(" - ");
              
              return (
                <Card key={p.id} className="group relative bg-white dark:bg-[#131d2e] rounded-[2.5rem] border border-black/[0.03] dark:border-[#1e2d45] overflow-hidden hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] transition-all duration-700 flex flex-col h-full">
                  {/* ... Card Content ... */}
                  <div className="relative h-56 overflow-hidden">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.nom} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
                     ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-white/5 text-gray-400">
                        <ImageIcon size={32} className="mb-2 opacity-20" />
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Aucun Visuel</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-30" />
                    
                    <span className={`absolute top-4 right-4 backdrop-blur-xl px-4 py-1.5 rounded-full text-[8px] font-semibold uppercase tracking-[0.2em] shadow-sm border border-white/40 ${p.norme_qualite === "Export" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {p.norme_qualite || "Local"}
                    </span>
                    
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                       <div className="w-8 h-8 rounded-xl bg-white/80 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                          <Zap size={14} fill="currentColor" className="text-emerald-600" />
                       </div>
                       <span className="text-[9px] text-white font-bold uppercase tracking-[0.1em] drop-shadow-md">Récolte Premium</span>
                    </div>

                    <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <Button 
                        size="icon" 
                        className="h-8 w-8 bg-black/60 hover:bg-black backdrop-blur-md text-white border-none rounded-xl"
                        onClick={() => handleOpenDialog(p)}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button 
                        size="icon" 
                        className="h-8 w-8 bg-rose-500/80 hover:bg-rose-600 backdrop-blur-md text-white border-none rounded-xl"
                        onClick={() => {
                          confirm({
                            title: "Supprimer le produit",
                            description: `Voulez-vous supprimer "${p.nom}" ? Cette action est irréversible.`,
                            confirmLabel: "Supprimer",
                            variant: "danger",
                            onConfirm: () => deleteMutation.mutate(p.id),
                          });
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-7 flex flex-col flex-grow">
                    <div className="mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors duration-500 truncate mr-2">
                        {p.nom}
                      </h3>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{p.variete || "Variété Élite"}</p>
                    </div>

                    <p className="text-[13px] text-gray-500/90 dark:text-gray-400 mb-6 line-clamp-2 leading-relaxed font-medium mt-2">
                      {p.description || "Excellence cultivée dans nos vergers de Casamance. Rigueur et qualité supérieure."}
                    </p>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-6 border-t border-black/[0.04] dark:border-white/5 mt-auto">
                      <div className="flex items-center gap-2.5">
                        <CalendarIcon size={14} className="text-orange-500 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate leading-none mb-0.5">{cleanSaison || "En cours"}</span>
                          <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 leading-none">Période</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Scale size={14} className="text-emerald-600 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate leading-none mb-0.5">{formatNumber(p.quantite_estimee || 0)} T</span>
                          <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 leading-none">Capacité</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MapPin size={14} className="text-emerald-700 dark:text-emerald-500 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate leading-none mb-0.5 truncate">{p.zone_production || "Casamance"}</span>
                          <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 leading-none">Origine</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Star size={14} className="text-amber-500 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate leading-none mb-0.5">Certifié</span>
                          <span className="text-[7px] uppercase font-bold tracking-widest text-gray-400 leading-none">Standard</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Premium Pagination */}
        {!isLoading && filteredProduits.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border border-gray-100 dark:border-[#1e2d45] bg-white dark:bg-[#131d2e] gap-4 mt-8 rounded-2xl shadow-sm">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredProduits.length)} sur {filteredProduits.length} produits
            </div>
            
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
              >
                <ChevronLeft size={14} />
              </Button>

              <div className="flex items-center gap-1.5 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p + 1)}
                    className={cn(
                      "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                      currentPage === p + 1
                        ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/10" 
                        : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    )}
                  >
                    {p + 1}
                  </button>
                ))}
              </div>

              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages} 
                className="h-9 w-9 rounded-xl border-gray-100 dark:border-white/10 bg-white dark:bg-transparent text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Upsert Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border border-black/5 bg-[#FDFCFB] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.4)] rounded-[2rem]">
            {/* Header */}
            <div className="relative overflow-hidden bg-[#0B1910] px-8 py-8">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
              <div className="relative flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-semibold text-white tracking-tight">
                    {editingProduit ? `Modifier ${editingProduit.nom}` : "Nouveau produit"}
                  </h2>
                  <p className="text-sm text-white/50 mt-1">Configurez les informations et tarifs pour le catalogue public.</p>
                </div>
                <div className="flex items-center gap-3 bg-white/10 p-1.5 pr-4 rounded-full border border-white/10 backdrop-blur-md">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                     <Package size={14} className="text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">Catalogue</span>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-2 gap-x-6 gap-y-7">
                <div className="space-y-2">
                  <Label>Nom du produit <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.nom} 
                    onChange={(e) => setFormData({...formData, nom: e.target.value})} 
                    placeholder="ex: Mangue Kent"
                    className="h-11 bg-white border-black/10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select 
                    value={formData.categorie} 
                    onValueChange={(v) => setFormData({...formData, categorie: v})}
                  >
                    <SelectTrigger className="h-11 bg-white border-black/10 rounded-xl">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fruits">Fruits</SelectItem>
                      <SelectItem value="Céréales">Céréales</SelectItem>
                      <SelectItem value="Riz">Riz</SelectItem>
                      <SelectItem value="Noix">Noix</SelectItem>
                      <SelectItem value="Oléagineux">Oléagineux</SelectItem>
                      <SelectItem value="Légumes">Légumes</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Variété</Label>
                  <Input 
                    value={formData.variete} 
                    onChange={(e) => setFormData({...formData, variete: e.target.value})} 
                    placeholder="ex: Kent, Keitt..."
                    className="h-11 bg-white border-black/10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zone de production</Label>
                  <Input 
                    value={formData.zone_production} 
                    onChange={(e) => setFormData({...formData, zone_production: e.target.value})} 
                    placeholder="ex: Casamance"
                    className="h-11 bg-white border-black/10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Saison / Fenêtre</Label>
                  <Input 
                    value={formData.saison} 
                    onChange={(e) => setFormData({...formData, saison: e.target.value})} 
                    placeholder="ex: Mars - Juin"
                    className="h-11 bg-white border-black/10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantité estimée (T)</Label>
                  <Input 
                    type="number"
                    value={formData.quantite_estimee} 
                    onChange={(e) => setFormData({...formData, quantite_estimee: Number(e.target.value)})} 
                    className="h-11 bg-white border-black/10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Norme Qualité</Label>
                  <Select 
                    value={formData.norme_qualite} 
                    onValueChange={(v) => setFormData({...formData, norme_qualite: v})}
                  >
                    <SelectTrigger className="h-11 bg-white border-black/10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Export">Export</SelectItem>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="Bio">Bio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2 pt-4 border-t border-black/5" />

                {/* E-COMMERCE SECTION */}
                <div className="col-span-2 bg-[#FAFAFA] rounded-2xl p-6 border border-black/[0.03]">
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-black/[0.04]">
                    <div>
                      <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#1A2E1C]">E-commerce public</h3>
                      <p className="text-xs text-gray-500 mt-1">Gérez l'affichage de ce produit sur le marketplace de la coopérative.</p>
                    </div>
                    <Switch
                      checked={formData.in_ecommerce}
                      onCheckedChange={(checked) => setFormData({ ...formData, in_ecommerce: checked })}
                    />
                  </div>

                  {formData.in_ecommerce && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <Label className="flex items-center justify-between">Prix Coopérative <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Exclusif</span></Label>
                         <div className="relative">
                           <Input 
                             type="number"
                             value={formData.prix_coop} 
                             onChange={(e) => setFormData({...formData, prix_coop: Number(e.target.value)})} 
                             className="h-11 bg-white border-emerald-100 focus-visible:ring-emerald-500 rounded-xl pr-12 font-semibold text-emerald-800"
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">CFA</span>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <Label>Prix Constaté Marché</Label>
                         <div className="relative">
                           <Input 
                             type="number"
                             value={formData.prix_marche} 
                             onChange={(e) => setFormData({...formData, prix_marche: Number(e.target.value)})} 
                             className="h-11 bg-white border-black/10 rounded-xl pr-12"
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">CFA</span>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              
                <div className="col-span-2 pt-4 border-t border-black/5" />

                <div className="col-span-2 space-y-2">
                  <Label className="flex items-center gap-2">
                    Visuel du produit
                    <span className="text-[10px] font-normal text-gray-400 italic bg-gray-100 px-2 py-0.5 rounded-full">Recommandé</span>
                  </Label>
                  
                  <div
                    className={`relative group rounded-[1.25rem] border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
                      formData.photo_url ? "border-transparent shadow-sm" : "border-gray-200 hover:border-emerald-400"
                    }`}
                    style={{ minHeight: "180px" }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) handleImageFile(f);
                    }}
                  >
                    {formData.photo_url ? (
                      <>
                        <img src={formData.photo_url} alt="" className="w-full h-[220px] object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                          <span className="text-white text-sm font-medium">Changer l'image</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormData((f) => ({ ...f, photo_url: "" })); }}
                            className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/40 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[180px] text-gray-400 gap-3 bg-gray-50/50">
                        {uploading ? (
                          <Loader2 size={32} className="animate-spin text-emerald-600" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center">
                            <Upload size={20} className="text-emerald-600" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-700">{uploading ? "Importation en cours…" : "Cliquez ou glissez une image"}</p>
                          <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, WebP (Max 5MB)</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
                  />

                  <div className="pt-3 flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase shrink-0">Ou URL externe :</span>
                    <Input 
                      value={formData.photo_url} 
                      onChange={(e) => setFormData({...formData, photo_url: e.target.value})} 
                      placeholder="https://images.unsplash.com/..."
                      className="h-9 text-xs border-black/10 bg-gray-50/50 rounded-xl"
                    />
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Description publique</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    placeholder="Mettez en valeur les qualités du produit..."
                    className="h-28 resize-none bg-white border-black/10 rounded-xl text-sm leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-8 mt-4">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl px-6 h-11 text-gray-500 hover:text-gray-900">Annuler</Button>
                <Button 
                  onClick={() => upsertMutation.mutate(formData)}
                  disabled={upsertMutation.isPending}
                  className="bg-[#1A2E1C] text-white hover:bg-[#112013] hover:shadow-lg rounded-xl px-8 h-11 transition-all"
                >
                  {upsertMutation.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  Sauvegarder le produit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};

export default CatalogueProduits;
