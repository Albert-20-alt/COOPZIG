import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  ShoppingBag, MapPin, Store, Calendar,
  Loader2, Plus, Pencil, Trash2, Search,
  Globe, LayoutGrid, TrendingUp
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const mobileMoneyOptions = [
  { id: "wave", label: "Wave", icon: "🌊" },
  { id: "orange_money", label: "Orange Money", icon: "🍊" },
  { id: "free_money", label: "Free Money", icon: "💚" },
  { id: "livraison", label: "En Espèces", icon: "🚛" },
];

const Marketplace = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [orderModal, setOrderModal] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState("");
  const [search, setSearch] = useState("");
  const confirm = useConfirm();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    nom: "", variete: "", zone_production: "", quantite_estimee: "", 
    norme_qualite: "Export", saison: "",
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const [a, s] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" }),
      ]);
      return (a.data ?? false) || (s.data ?? false);
    },
    enabled: !!user,
  });

  const { data: produits = [], isLoading } = useQuery({
    queryKey: ["produits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produits").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const addProduitMutation = useMutation({
    mutationFn: async (prod: any) => {
      if (editingProduct) {
        const { error } = await supabase.from("produits").update(prod).eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produits").insert(prod);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      toast.success(editingProduct ? "Produit mis à jour" : "Produit ajouté");
      setIsAddProductOpen(false); setEditingProduct(null);
    }
  });

  const deleteProduct = useMutation({
     mutationFn: async (id: string) => { const { error } = await supabase.from("produits").delete().eq("id", id); if (error) throw error; },
     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["produits"] }); toast.success("Produit retiré"); }
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Veuillez vous connecter pour commander");
      const { error } = await supabase.from("commandes").insert({
        acheteur_id: user.id, produit_id: orderModal.id, produit_nom: orderModal.nom,
        quantite: Number(qty), unite: "kg", mode_paiement: selectedPayment,
        statut: "En attente", statut_paiement: selectedPayment === "livraison" ? "Non payé" : "En cours",
        lieu_livraison: "Adresse par défaut",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Votre intention d'achat a été transmise !");
      setOrderModal(null); setSelectedPayment(null); setPhone(""); setQty("");
      queryClient.invalidateQueries({ queryKey: ["commandes"] });
    },
  });

  const filtered = produits.filter(p => !search || p.nom.toLowerCase().includes(search.toLowerCase()) || p.variete?.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout title="Marketplace" subtitle="Accès direct aux stocks de la coopérative">
      <div className="space-y-6">

        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Store className="text-[#1A2E1C]"/> Marché CRPAZ</h1>
            <p className="text-sm text-gray-500 mt-1">Sécurisez vos approvisionnements directement auprès des producteurs.</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="bg-white">
                <Globe className="mr-2" size={16}/> Carte des bassins
             </Button>
            {isAdmin && (
              <Button onClick={() => { setEditingProduct(null); setNewProduct({ nom: "", variete: "", zone_production: "", quantite_estimee: "", norme_qualite: "Export", saison: ""}); setIsAddProductOpen(true); }} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
                <Plus className="mr-2" size={16} />
                Nouveau Produit
              </Button>
            )}
          </div>
        </div>

        {/* Global Toolbar / Search */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                placeholder="Chercher (Mangue, Cajou...)"
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 border-gray-200 w-full"
              />
           </div>
           
           <div className="flex items-center gap-3 text-sm text-gray-600 font-medium whitespace-nowrap">
               <span className="flex items-center gap-1"><LayoutGrid size={16}/> {filtered.length} Offres actives</span>
           </div>
        </div>

        {/* Product Catalog */}
        {isLoading ? (
           <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((p) => (
                 <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group flex flex-col">
                    <div className="p-5 flex flex-col h-full">
                       <div className="flex justify-between items-start mb-4">
                          <div className="h-16 w-16 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-3xl">
                             {p.nom.toLowerCase().includes("mangue") ? "🥭" : p.nom.toLowerCase().includes("cajou") ? "🥜" : "🌿"}
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-700 border-none">
                             {p.norme_qualite}
                          </Badge>
                       </div>

                       <div className="mb-4">
                          <h3 className="text-lg font-bold text-gray-900">{p.nom}</h3>
                          <p className="text-sm font-medium text-gray-500 mt-1">{p.variete || "Toutes variétés"}</p>
                       </div>

                       <div className="space-y-2 mb-6 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                             <MapPin size={16} className="text-gray-400" /> {p.zone_production || "Sénégal"}
                          </div>
                          <div className="flex items-center gap-2">
                             <TrendingUp size={16} className="text-gray-400" /> Stock est: <span className="font-bold text-gray-900">{p.quantite_estimee} T</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <Calendar size={16} className="text-gray-400" /> Saison: {p.saison || "Annuelle"}
                          </div>
                       </div>

                       <div className="mt-auto pt-4 border-t border-gray-100">
                          <Button 
                             onClick={() => setOrderModal(p)}
                             className="w-full bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
                          >
                             <ShoppingBag size={16} className="mr-2" /> Négocier
                          </Button>
                       </div>
                    </div>
                    {isAdmin && (
                       <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 bg-white border border-gray-200 shadow-sm" onClick={() => { setEditingProduct(p); setNewProduct(p); setIsAddProductOpen(true); }}><Pencil size={12}/></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 bg-white border border-gray-200 shadow-sm text-red-600" onClick={() => {
                             confirm({
                               title: "Supprimer l'offre",
                               description: `Voulez-vous retirer "${p.nom}" du catalogue ?`,
                               confirmLabel: "Supprimer",
                               variant: "danger",
                               onConfirm: () => deleteProduct.mutate(p.id),
                             });
                           }}><Trash2 size={12}/></Button>
                       </div>
                    )}
                 </div>
              ))}
            </div>
        )}

      {/* Order Dialog - Premium Design */}
      <Dialog open={!!orderModal} onOpenChange={(o) => !o && setOrderModal(null)}>
         <DialogContent className="max-w-xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
            <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <ShoppingBag className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">Négocier : {orderModal?.nom}</DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Établissement d'une intention d'achat sécurisée</p>
                 </div>
               </div>
            </div>
            
            <div className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-full space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Volume d'achat souhaité (kg) *</Label>
                     <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors" />
                  </div>
                  <div className="col-span-full space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Protocole de paiement</Label>
                     <Select value={selectedPayment || ""} onValueChange={setSelectedPayment}>
                        <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue placeholder="Choisir un mode..." /></SelectTrigger>
                        <SelectContent>
                           {mobileMoneyOptions.map(opt => (
                              <SelectItem key={opt.id} value={opt.id}>{opt.icon} {opt.label}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               {selectedPayment && selectedPayment !== "livraison" && (
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identifiant Téléphonique *</Label>
                     <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 XX XXX XX XX" className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors" />
                  </div>
               )}

               <div className="pt-4 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setOrderModal(null)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                  <Button 
                    onClick={() => orderMutation.mutate()}
                    disabled={!qty || !selectedPayment || orderMutation.isPending}
                    className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10"
                  >
                     {orderMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                     Soumettre la demande
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>

      {/* Add Product Dialog (Admin) - Premium Design */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
         <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] border border-black/[0.06] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
             <div className="relative bg-[#0B1910] px-8 py-7 overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/30 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                   <Plus className="text-emerald-400" size={22} />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold text-white">
                      {editingProduct ? "Gérer l'offre" : "Nouvelle Cotation"}
                   </DialogTitle>
                   <p className="text-sm text-white/50 mt-0.5">Mise en ligne de stocks certifiés</p>
                 </div>
               </div>
             </div>
             
             <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom du Produit *</Label>
                      <Input value={newProduct.nom} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Variété / Type</Label>
                      <Input value={newProduct.variete} onChange={e => setNewProduct({...newProduct, variete: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zone de Production</Label>
                      <Input value={newProduct.zone_production} onChange={e => setNewProduct({...newProduct, zone_production: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Norme de Qualité</Label>
                      <Select value={newProduct.norme_qualite} onValueChange={v => setNewProduct({...newProduct, norme_qualite: v})}>
                         <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"><SelectValue /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="Export">Global G.A.P (Export)</SelectItem>
                            <SelectItem value="Premium Loc">Marché Local Premium</SelectItem>
                            <SelectItem value="Industriel">Transformation / Industriel</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Volume Disponible (T)</Label>
                      <Input type="number" value={newProduct.quantite_estimee} onChange={e => setNewProduct({...newProduct, quantite_estimee: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fenêtre de Disponibilité</Label>
                      <Input value={newProduct.saison} onChange={e => setNewProduct({...newProduct, saison: e.target.value})} className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white" />
                   </div>
                </div>
 
                <div className="pt-6 flex justify-end gap-3">
                   <Button variant="ghost" onClick={() => setIsAddProductOpen(false)} className="rounded-xl px-5 h-11 text-gray-500 font-bold">Annuler</Button>
                   <Button className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-900/10" onClick={() => addProduitMutation.mutate(newProduct)} disabled={addProduitMutation.isPending}>
                      {addProduitMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                      Publier l'Offre
                   </Button>
                </div>
             </div>
         </DialogContent>
       </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Marketplace;
