import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── helpers ────────────────────────────────────────────────────────────────────
function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

type Notif = {
  type: string;
  title: string;
  body: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const notifications: Notif[] = [];

    // ── 1. Cotisations en retard (> 30 jours, statut != Payé) ────────────────
    const { data: cotisations } = await supabase
      .from("cotisations")
      .select("id, periode, date_paiement, statut, producteurs(nom)")
      .neq("statut", "Payé");

    for (const c of cotisations ?? []) {
      if (c.date_paiement && daysSince(c.date_paiement) > 30) {
        const nom = (c.producteurs as any)?.nom ?? "Inconnu";
        notifications.push({
          type: "cotisation_retard",
          title: `Cotisation en retard — ${nom}`,
          body: `Période : ${c.periode} · Impayée depuis ${daysSince(c.date_paiement)} jours`,
        });
      }
    }

    // ── 2. Stocks critiques (quantite_disponible <= 0) ────────────────────────
    const { data: stocks } = await supabase
      .from("stocks")
      .select("id, produit_nom, quantite_disponible, unite")
      .lte("quantite_disponible", 0);

    for (const s of stocks ?? []) {
      notifications.push({
        type: "stock_critique",
        title: `Stock épuisé — ${s.produit_nom}`,
        body: `Le stock de ${s.produit_nom} est à 0 ${s.unite || "unités"}. Réapprovisionnement requis.`,
      });
    }

    // ── 3. Vergers bloqués en état "Récolte" depuis > 14 jours ───────────────
    const { data: vergers } = await supabase
      .from("vergers")
      .select("id, nom, etat, updated_at")
      .eq("etat", "Récolte");

    for (const v of vergers ?? []) {
      if (v.updated_at && daysSince(v.updated_at) > 14) {
        notifications.push({
          type: "verger_bloque",
          title: `Verger en récolte prolongée — ${v.nom}`,
          body: `Le verger "${v.nom}" est en état Récolte depuis ${daysSince(v.updated_at)} jours sans mise à jour.`,
        });
      }
    }

    // ── 4. Producteurs inactifs (statut_actif = false) avec cotisations dues ──
    const { data: inactifs } = await supabase
      .from("producteurs")
      .select("id, nom, cotisations(statut)")
      .eq("statut_actif", false);

    for (const p of inactifs ?? []) {
      const dues = ((p.cotisations as any[]) ?? []).filter((c: any) => c.statut !== "Payé");
      if (dues.length > 0) {
        notifications.push({
          type: "producteur_inactif_dette",
          title: `Producteur inactif avec dettes — ${p.nom}`,
          body: `${p.nom} est inactif et a ${dues.length} cotisation(s) non réglée(s).`,
        });
      }
    }

    // ── Deduplicate: skip if an identical unread notif exists (last 7 days) ──
    const { data: recentNotifs } = await supabase
      .from("admin_notifications")
      .select("title, body")
      .eq("is_read", false)
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());

    const recentSet = new Set(
      (recentNotifs ?? []).map((n: any) => `${n.title}||${n.body}`)
    );

    const toInsert = notifications.filter(
      (n) => !recentSet.has(`${n.title}||${n.body}`)
    );

    if (toInsert.length > 0) {
      await supabase.from("admin_notifications").insert(
        toInsert.map((n) => ({ ...n, is_read: false }))
      );
    }

    return new Response(
      JSON.stringify({ inserted: toInsert.length, total_detected: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
