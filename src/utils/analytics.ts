import ReactGA from "react-ga4";

export const initAnalytics = () => {
  // Remplacer par l'ID réel dans l'environnement de production
  const TRACKING_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";
  
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS) {
    ReactGA.initialize(TRACKING_ID);
    console.log("Analytics initialized in PROD mode");
  } else {
    // Permet de voir les envois dans la console en développement si on le souhaite
    console.log("Analytics initialization bypassed in DEV mode");
  }
};

export const logPageView = (path: string) => {
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS) {
    ReactGA.send({ hitType: "pageview", page: path });
  }
};

export const logEvent = (category: string, action: string, label?: string) => {
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS) {
    ReactGA.event({
      category,
      action,
      label,
    });
  } else {
    console.log(`[Analytics Event] ${category} - ${action} ${label ? `(${label})` : ""}`);
  }
};
