import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé — token manquant" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: "Non autorisé — token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check permissions (Superadmin OR specific permission for some actions)
    const { data: isSuperAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "superadmin",
    });

    const { data: canDeleteUsers } = await supabaseAdmin.rpc("has_special_permission", {
      _user_id: caller.id,
      _permission: "can_delete_users",
    });

    const body = await req.json();
    const { action = "create", userId, email, password, fullName, phone, entreprise, role } = body;

    // ─── ACTION: DELETE ───────────────────────────────────────────────────────
    if (action === "delete") {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
      
      if (!isSuperAdmin && !isAdmin && !canDeleteUsers) {
        return new Response(JSON.stringify({ error: "Permission de suppression requise" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!userId) throw new Error("userId requis pour la suppression");
      if (userId === caller.id) throw new Error("Vous ne pouvez pas vous supprimer vous-même");

      // Protect other superadmins
      const { data: targetIsSA } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "superadmin" });
      if (targetIsSA) throw new Error("Impossible de supprimer un compte superadmin");

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true, message: "Utilisateur supprimé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: UPDATE EMAIL ─────────────────────────────────────────────────
    if (action === "update-email") {
      if (!isSuperAdmin) throw new Error("Seul un superadmin peut changer l'email d'un compte");
      if (!userId || !email) throw new Error("userId et email requis");

      const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { email, email_confirm: true });
      if (upErr) throw upErr;

      return new Response(JSON.stringify({ success: true, message: "Email mis à jour" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: CREATE (default) ────────────────────────────────────────────
    if (action === "create") {
      if (!isSuperAdmin) throw new Error("Accès réservé aux superadmins");
      if (!email || !password || !role) throw new Error("Email, mot de passe et rôle requis");

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError) throw createError;

      // Profile details
      await supabaseAdmin.from("profiles").update({
        phone: phone || null,
        entreprise: entreprise || null,
        full_name: fullName || "",
      }).eq("user_id", newUser.user.id);

      // Role
      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role });

      // Special logic for producteur
      if (role === "producteur") {
        await supabaseAdmin.from("producteurs").insert({
          user_id: newUser.user.id,
          nom: fullName || email,
        });
      }

      return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Action non reconnue");

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
