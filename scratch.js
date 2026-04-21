const fs = require('fs');

const frFile = 'public/locales/fr/translation.json';
const enFile = 'public/locales/en/translation.json';

let fr = JSON.parse(fs.readFileSync(frFile, 'utf8'));
let en = JSON.parse(fs.readFileSync(enFile, 'utf8'));

// Nav extensions
fr.nav = { ...fr.nav, order: "Commander", dashboard: "Tableau de bord" };
en.nav = { ...en.nav, order: "Order", dashboard: "Dashboard" };

// Footer extensions
fr.landing.footer = { ...fr.landing.footer, nav_about: "Qui sommes-nous", privacy: "Vie Privée", terms: "Termes", support: "Support", newsletter_success: "Merci ! Vous êtes inscrit à notre newsletter.", newsletter_duplicate: "Vous êtes déjà inscrit à notre newsletter.", newsletter_error: "Une erreur est survenue. Veuillez réessayer." };
en.landing.footer = { ...en.landing.footer, nav_about: "About Us", privacy: "Privacy", terms: "Terms", support: "Support", newsletter_success: "Thank you! You are subscribed to our newsletter.", newsletter_duplicate: "You are already subscribed to our newsletter.", newsletter_error: "An error occurred. Please try again." };

// Order
fr.landing.order.product_options = {
  mangue_kent: "Mangue Kent", anacarde: "Anacarde", agrumes: "Agrumes (Orange/Citron)", banane: "Banane Plantain", mangue_sechee: "Mangue Séchée", ditakh: "Ditakh", autre: "Autre"
};
en.landing.order.product_options = {
  mangue_kent: "Kent Mango", anacarde: "Cashew", agrumes: "Citrus (Orange/Lemon)", banane: "Plantain Banana", mangue_sechee: "Dried Mango", ditakh: "Ditakh", autre: "Other"
};
fr.landing.order.select = "Sélectionner";
en.landing.order.select = "Select";
fr.landing.order.error_fields = "Veuillez remplir tous les champs obligatoires";
en.landing.order.error_fields = "Please fill all required fields";
fr.landing.order.error_send = "Erreur lors de l'envoi. Veuillez réessayer.";
en.landing.order.error_send = "Error sending. Please try again.";
fr.landing.order.success = "Votre demande a été envoyée avec succès !";
en.landing.order.success = "Your request has been sent successfully!";

// Calendar
fr.landing.calendar.months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
en.landing.calendar.months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Hero
fr.landing.hero = { ...fr.landing.hero, badge_location: "Casamance, Sénégal", scroll: "Défiler", vertical_label: "CRPAZ — Coopérative de Ziguinchor" };
en.landing.hero = { ...en.landing.hero, badge_location: "Casamance, Senegal", scroll: "Scroll", vertical_label: "CRPAZ — Ziguinchor Cooperative" };

fs.writeFileSync(frFile, JSON.stringify(fr, null, 2));
fs.writeFileSync(enFile, JSON.stringify(en, null, 2));
