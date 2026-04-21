import { Helmet } from "react-helmet-async";
import { useConfigValue } from "@/hooks/useSiteConfig";
import { useTranslation } from "react-i18next";

/**
 * SiteMeta Component
 * Injected globally in App.tsx to automatically apply SEO metadata
 * and site branding fetched from Supabase.
 */
const SiteMeta = () => {
  const { t, i18n } = useTranslation();
  const rawSiteName = useConfigValue("site_name", "CRPAZ");
  const siteSubtitle = useConfigValue("site_subtitle", t("landing.footer.site_subtitle", "Coopérative de Ziguinchor"));
  const siteDescription = useConfigValue("site_description", t("landing.footer.footer_desc", "Site officiel de la Coopérative Régionale des Planteurs et Agriculteurs de Ziguinchor (CRPAZ). Excellence agricole en Casamance : mangues, anacarde, agrumes."));
  const faviconUrl = useConfigValue("favicon_url", "/favicon.svg") as string; // Default favicon

  // Set appropriate type based on file extension
  let faviconType = "image/x-icon";
  if (faviconUrl.endsWith(".svg")) {
    faviconType = "image/svg+xml";
  } else if (faviconUrl.endsWith(".png")) {
    faviconType = "image/png";
  } else if (faviconUrl.endsWith(".jpg") || faviconUrl.endsWith(".jpeg")) {
    faviconType = "image/jpeg";
  }

  const title = `${rawSiteName} — ${siteSubtitle}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={siteDescription} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={siteDescription} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={siteDescription} />
      <link rel="icon" type={faviconType} href={faviconUrl} />
    </Helmet>
  );
};

export default SiteMeta;
