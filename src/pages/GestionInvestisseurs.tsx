import { useState, useEffect } from "react";
import { 
  Save, AlertCircle, Sprout, ShoppingBag,
  BadgeDollarSign, Loader2, TrendingUp,
  Users, Globe, ShieldAlert
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig, useUpdateSiteConfig } from "@/hooks/useSiteConfig";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const defaultKPIs = {
  annuel: { prod: { act: 1850, prev: 1540 }, ventes: { act: 1720, prev: 1480 }, partenaires: { act: 45, prev: 38 } },
  semestriel: { prod: { act: 900, prev: 750 }, ventes: { act: 850, prev: 710 }, partenaires: { act: 45, prev: 42 } },
  trimestriel: { prod: { act: 450, prev: 380 }, ventes: { act: 420, prev: 350 }, partenaires: { act: 45, prev: 44 } },
  mensuel: { prod: { act: 150, prev: 130 }, ventes: { act: 140, prev: 120 }, partenaires: { act: 45, prev: 45 } }
};

const defaultSpeculations = [
  { name: "Mangue Kent", prod: 800, target: 1000 },
  { name: "Anacarde", prod: 600, target: 500 },
  { name: "Agrumes", prod: 250, target: 400 },
  { name: "Banane", prod: 200, target: 200 },
];

const defaultRegions = [
  { nom: "Dakar", prixTonne: 45000 },
  { nom: "Thiès", prixTonne: 40000 },
  { nom: "Ziguinchor (Local)", prixTonne: 10000 },
  { nom: "Saint-Louis", prixTonne: 60000 },
];

const defaultPricing = [
  { nom: "Mangue Kent", prixActuel: "350", prixPasse: "320" },
  { nom: "Anacarde", prixActuel: "420", prixPasse: "450" },
];

const StatInputGroup = ({ label, icon: Icon, activeValue, prevValue, onActiveChange, onPrevChange, unit }: any) => (
  <div className="space-y-4">
     <div className="flex items-center gap-2 text-gray-900 font-bold mb-4">
       <Icon size={18} className="text-emerald-600" /> {label}
     </div>
     <div className="space-y-3">
        <div>
           <Label className="text-xs text-gray-500 mb-1 block">Valeur Actuelle</Label>
           <div className="relative">
             <Input type="number" value={activeValue} onChange={(e) => onActiveChange(Number(e.target.value) || 0)} className="pr-12" />
             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{unit}</span>
           </div>
        </div>
        <div>
           <Label className="text-xs text-gray-500 mb-1 block">Valeur Précédente</Label>
           <div className="relative">
             <Input type="number" value={prevValue} onChange={(e) => onPrevChange(Number(e.target.value) || 0)} className="pr-12 bg-gray-50" />
             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{unit}</span>
           </div>
        </div>
     </div>
  </div>
);

const GestionInvestisseurs = () => {
  const { user } = useAuth();
  const { data: configs, isLoading: configsLoading } = useSiteConfig();
  const updateConfig = useUpdateSiteConfig();

  const [kpis, setKpis] = useState(defaultKPIs);
  const [speculations, setSpeculations] = useState(defaultSpeculations);
  const [regions, setRegions] = useState(defaultRegions);
  const [pricing, setPricing] = useState(defaultPricing);
  const [isSaving, setIsSaving] = useState(false);

  const { data: isSuperAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["isSuperAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" });
      return data ?? false;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (configs) {
      const getJson = (key: string, fallback: any) => {
        const item = configs.find((c) => c.cle === key);
        if (item && item.valeur) {
          try { return JSON.parse(item.valeur); } catch (e) { return fallback; }
        }
        return fallback;
      };
      setKpis(getJson("invest_kpi_data", defaultKPIs));
      setSpeculations(getJson("invest_speculations", defaultSpeculations));
      setRegions(getJson("invest_regions", defaultRegions));
      setPricing(getJson("invest_pricing", defaultPricing));
    }
  }, [configs]);

  const handleSaveJson = async (key: string, obj: any) => {
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({ cle: key, valeur: JSON.stringify(obj) });
      toast.success("Mise à jour enregistrée avec succès");
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  if (roleLoading || configsLoading) {
    return (
       <DashboardLayout title="Portail Investisseurs">
         <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
       </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
       <DashboardLayout title="Portail Investisseurs">
         <div className="bg-white p-8 text-center rounded-xl border border-gray-100 shadow-sm max-w-lg mx-auto mt-12">
           <ShieldAlert className="text-amber-500 mx-auto mb-4" size={48} />
           <h2 className="text-xl font-bold text-gray-900 mb-2">Accès Restreint</h2>
           <p className="text-gray-500">Cette page de configuration des données publiques est réservée au Super Administrateur.</p>
         </div>
       </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Portail Investisseurs" subtitle="Gestion des données publiques (KPIs, Objectifs, Prix)">
      <div className="space-y-6">

        {/* Info Box */}
         <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-4 flex gap-3 text-sm">
            <AlertCircle size={20} className="shrink-0" />
            <p><strong>Note :</strong> Les données saisies sur cette page sont synchronisées et affichées en temps réel sur la page publique <em>"Informations Investisseurs"</em> (landing page publique).</p>
         </div>

        {/* Configuration Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <Tabs defaultValue="kpis">
               <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
                  <TabsList className="bg-transparent space-x-2 p-0 h-auto">
                     <TabsTrigger value="kpis" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 flex items-center gap-2"><TrendingUp size={16}/> KPIs Globaux</TabsTrigger>
                     <TabsTrigger value="speculations" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 flex items-center gap-2"><Sprout size={16}/> Filières</TabsTrigger>
                     <TabsTrigger value="regions" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 flex items-center gap-2"><Globe size={16}/> Prix par Région</TabsTrigger>
                     <TabsTrigger value="pricing" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 flex items-center gap-2"><BadgeDollarSign size={16}/> Tendances Marché</TabsTrigger>
                  </TabsList>
               </div>

               {/* TAB 1: KPIs */}
               <TabsContent value="kpis" className="p-6 m-0 outline-none">
                  <div className="space-y-8">
                     {Object.keys(kpis).map((periode) => {
                       const p = periode as keyof typeof kpis;
                       return (
                         <div key={p} className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 capitalize">Période: {p}</h3>
                            <div className="grid md:grid-cols-3 gap-8">
                               <StatInputGroup 
                                  label="Production" icon={Sprout} unit="T"
                                  activeValue={kpis[p].prod.act} prevValue={kpis[p].prod.prev}
                                  onActiveChange={(v: number) => setKpis(prev => ({...prev, [p]: { ...prev[p], prod: { ...prev[p].prod, act: v } }}))}
                                  onPrevChange={(v: number) => setKpis(prev => ({...prev, [p]: { ...prev[p], prod: { ...prev[p].prod, prev: v } }}))}
                               />
                               <StatInputGroup 
                                  label="Ventes" icon={ShoppingBag} unit="CFA"
                                  activeValue={kpis[p].ventes.act} prevValue={kpis[p].ventes.prev}
                                  onActiveChange={(v: number) => setKpis(prev => ({...prev, [p]: { ...prev[p], ventes: { ...prev[p].ventes, act: v } }}))}
                                  onPrevChange={(v: number) => setKpis(prev => ({...prev, [p]: { ...prev[p], ventes: { ...prev[p].ventes, prev: v } }}))}
                               />
                               <StatInputGroup 
                                  label="Partenaires" icon={Users} unit=""
                                  activeValue={kpis[p].partenaires.act} prevValue={kpis[p].partenaires.prev}
                                  onActiveChange={(v: number) => setKpis(prev => ({...prev, [p]: { ...prev[p], partenaires: { ...prev[p].partenaires, act: v } }}))}
                                  onPrevChange={(v: number) => setKpis(prev => ({...prev, [p]: { ...prev[p], partenaires: { ...prev[p].partenaires, prev: v } }}))}
                               />
                            </div>
                         </div>
                       )
                     })}
                     <Button onClick={() => handleSaveJson("invest_kpi_data", kpis)} disabled={isSaving} className="bg-[#1A2E1C] text-white w-full sm:w-auto">
                        {isSaving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />} Enregistrer KPIs
                     </Button>
                  </div>
               </TabsContent>

               {/* TAB 2: Spéculations / Filières */}
               <TabsContent value="speculations" className="p-6 m-0 outline-none space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                     {speculations.map((spec, idx) => (
                        <Card key={idx} className="shadow-none border-gray-200">
                           <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
                              <CardTitle className="text-base font-bold flex justify-between items-center">
                                 {spec.name}
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-4 space-y-4">
                              <div>
                                 <Label className="text-xs text-gray-500 mb-1 block">Production Actuelle (T)</Label>
                                 <Input type="number" value={spec.prod} onChange={(e) => { const n = [...speculations]; n[idx].prod = Number(e.target.value) || 0; setSpeculations(n); }} />
                              </div>
                              <div>
                                 <Label className="text-xs text-gray-500 mb-1 block">Objectif (T)</Label>
                                 <Input type="number" value={spec.target} onChange={(e) => { const n = [...speculations]; n[idx].target = Number(e.target.value) || 0; setSpeculations(n); }} />
                              </div>
                           </CardContent>
                        </Card>
                     ))}
                  </div>
                  <Button onClick={() => handleSaveJson("invest_speculations", speculations)} disabled={isSaving} className="bg-[#1A2E1C] text-white">
                     {isSaving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />} Enregistrer Filières
                  </Button>
               </TabsContent>

               {/* TAB 3: Régions & Logistique */}
               <TabsContent value="regions" className="p-6 m-0 outline-none space-y-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {regions.map((reg, idx) => (
                        <div key={idx} className="space-y-3 p-4 border border-gray-200 rounded-lg">
                           <div>
                              <Label className="text-xs text-gray-500 mb-1 block">Nom de la Région</Label>
                              <Input value={reg.nom} onChange={(e) => { const n = [...regions]; n[idx].nom = e.target.value; setRegions(n); }} />
                           </div>
                           <div>
                              <Label className="text-xs text-gray-500 mb-1 block">Prix par Tonne (CFA)</Label>
                              <Input type="number" value={reg.prixTonne} onChange={(e) => { const n = [...regions]; n[idx].prixTonne = Number(e.target.value) || 0; setRegions(n); }} />
                           </div>
                        </div>
                     ))}
                  </div>
                  <Button onClick={() => handleSaveJson("invest_regions", regions)} disabled={isSaving} className="bg-[#1A2E1C] text-white">
                     {isSaving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />} Enregistrer Tarification Logistique
                  </Button>
               </TabsContent>

               {/* TAB 4: Indices Prix */}
               <TabsContent value="pricing" className="p-6 m-0 outline-none space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                     {pricing.map((item, idx) => (
                        <Card key={idx} className="shadow-none border-gray-200">
                           <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
                              <CardTitle className="text-base font-bold flex justify-between items-center">
                                 {item.nom}
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-4 space-y-4">
                              <div>
                                 <Label className="text-xs text-gray-500 mb-1 block">Prix Actuel (FCFA/Kg)</Label>
                                 <Input value={item.prixActuel} onChange={(e) => { const n = [...pricing]; n[idx].prixActuel = e.target.value; setPricing(n); }} />
                              </div>
                              <div>
                                 <Label className="text-xs text-gray-500 mb-1 block">Prix Précédent (FCFA/Kg)</Label>
                                 <Input value={item.prixPasse} onChange={(e) => { const n = [...pricing]; n[idx].prixPasse = e.target.value; setPricing(n); }} />
                              </div>
                           </CardContent>
                        </Card>
                     ))}
                  </div>
                  <Button onClick={() => handleSaveJson("invest_pricing", pricing)} disabled={isSaving} className="bg-[#1A2E1C] text-white">
                     {isSaving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />} Enregistrer Prix du Marché
                  </Button>
               </TabsContent>

            </Tabs>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default GestionInvestisseurs;
