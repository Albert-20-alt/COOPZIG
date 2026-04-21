import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteConfig = {
  id: string;
  cle: string;
  valeur: string | null;
  type: string | null;
  categorie: string | null;
};

export const useSiteConfig = () => {
  return useQuery({
    queryKey: ["site-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_config")
        .select("*")
        .order("categorie");
      if (error) throw error;
      return data as SiteConfig[];
    },
  });
};

import { useTranslation } from "react-i18next";

export const useConfigValue = (cle: string, defaultValue: string = "") => {
  const { data: configs } = useSiteConfig();
  const { i18n } = useTranslation();
  
  const config = configs?.find((c) => c.cle === cle);
  
  const nonTranslatableKeys = ["logo_url", "favicon_url", "contact_phone", "contact_email", "social_facebook", "social_twitter", "social_linkedin", "social_instagram"];

  if (i18n.language && !i18n.language.startsWith("fr") && !nonTranslatableKeys.includes(cle)) {
    return defaultValue;
  }

  return config?.valeur ?? defaultValue;
};

export const useUpdateSiteConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cle, valeur }: { cle: string; valeur: string }) => {
      const { data: existing } = await supabase
        .from("site_config")
        .select("id")
        .eq("cle", cle)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("site_config")
          .update({ valeur, updated_at: new Date().toISOString() })
          .eq("cle", cle);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_config")
          .insert({ cle, valeur });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
    },
  });
};

export const useUploadSiteAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      fileName,
      configKey,
    }: {
      file: File;
      fileName: string;
      configKey: string;
    }) => {
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName);

      // Update config with URL
      const { data: existing } = await supabase
        .from("site_config")
        .select("id")
        .eq("cle", configKey)
        .single();

      if (existing) {
        await supabase
          .from("site_config")
          .update({ valeur: urlData.publicUrl, updated_at: new Date().toISOString() })
          .eq("cle", configKey);
      } else {
        await supabase
          .from("site_config")
          .insert({ cle: configKey, valeur: urlData.publicUrl, type: "image", categorie: "branding" });
      }

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
    },
  });
};
