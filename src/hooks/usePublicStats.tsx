import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicStats = {
  totalProducers: number;
  totalHectares: number;
  annualProduction: number;
  tauxCommercialisation: number;
  zonesCount: number;
  varietesCount: number;
  totalStock: number;
  catalogueCount: number;
};

export const usePublicStats = () => {
  return useQuery({
    queryKey: ["public-stats-dynamic"],
    queryFn: async () => {
      // 1. Producteurs
      const { count: prodCount, error: err1 } = await supabase
        .from("producteurs")
        .select("*", { count: "exact", head: true });

      // 2. Hectares
      const { data: vergers, error: err2 } = await supabase.from("vergers").select("superficie");
      const totalHectares = vergers?.reduce((sum, v) => sum + (v.superficie || 0), 0) || 0;

      // 3. Production annuelle
      const { data: recoltes, error: err3 } = await supabase.from("recoltes").select("quantite");
      const annualProduction = recoltes?.reduce((sum, r) => sum + (r.quantite || 0), 0) || 0;

      // 4. Commandes / Taux de vente
      const { data: commandes } = await supabase.from("commandes").select("quantite").neq("statut", "annulée");
      const totalVendu = commandes?.reduce((sum, c) => sum + (c.quantite || 0), 0) || 0;
      let tauxCommercialisation = 0;
      if (annualProduction > 0) {
        tauxCommercialisation = Math.min(100, Math.round((totalVendu / annualProduction) * 100));
      }

      // 5. Zones de production
      const { data: producteursLoc } = await supabase.from("producteurs").select("localisation");
      const zonesSet = new Set(producteursLoc?.map(p => p.localisation?.trim()?.toLowerCase()).filter(Boolean));
      const zonesCount = zonesSet.size || 0;

      // 6. Catalogue produits — count + total stock disponible
      const { count: prodDataCount, data: produitsData } = await supabase
        .from("produits")
        .select("quantite_estimee", { count: "exact" });

      const totalStock = produitsData?.reduce((sum, p) => sum + (p.quantite_estimee || 0), 0) || 0;

      if (err1) console.error("Error fetching producers:", err1);
      if (err2) console.error("Error fetching hectares:", err2);
      if (err3) console.error("Error fetching production:", err3);

      return {
        totalProducers: prodCount || 0,
        totalHectares,
        annualProduction,
        tauxCommercialisation,
        zonesCount,
        varietesCount: prodDataCount || 0,
        totalStock,
        catalogueCount: prodDataCount || 0,
      } as PublicStats;
    },
    staleTime: 1000 * 60 * 5,
  });
};
