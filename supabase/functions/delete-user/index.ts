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
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Non autorisé — token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is superadmin OR has can_delete_users permission
    const { data: isSuperAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "superadmin",
    });

    const { data: canDeleteUsers } = await supabaseAdmin.rpc("has_special_permission", {
      _user_id: caller.id,
      _permission: "can_delete_users",
    });

    if (!isSuperAdmin && !canDeleteUsers) {
      return new Response(JSON.stringify({ error: "Permission insuffisante pour supprimer des utilisateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target user ID from body
    const { userId: targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "userId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (targetUserId === caller.id) {
      return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Protect superadmins — nobody can delete a superadmin
    const { data: targetIsSuperAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: targetUserId,
      _role: "superadmin",
    });

    if (targetIsSuperAdmin) {
      return new Response(JSON.stringify({ error: "Les comptes superadmin ne peuvent pas être supprimés" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete the user from Supabase Auth (cascades to profiles/roles via FK)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, deletedUserId: targetUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
