import { useState } from "react";
import {
  FileDown, FileText, Users, Sprout, Package,
  ShoppingCart, Coins, PiggyBank, Wallet, Inbox,
  Loader2, CheckCircle2, Eye, Search, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── helpers ─────────────────────────────────────────────────────────────────

const today = () => format(new Date(), "dd MMMM yyyy", { locale: fr });
const fileDate = () => format(new Date(), "yyyy-MM-dd");

function buildPDF(title: string, headers: string[], rows: (string | number)[][]): jsPDF {
  const orientation = headers.length > 6 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(26, 46, 28); // CRPAZ Dark Green
  doc.rect(0, 0, pageWidth, 5, "F");

  doc.setFontSize(24);
  doc.setTextColor(26, 46, 28);
  doc.setFont("helvetica", "bold");
  doc.text("CRPAZ", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Coopérative Régionale des Planteurs et Agriculteurs de Ziguinchor", 14, 25);
  doc.text("Siège : Ziguinchor, Sénégal | Email : contact@crpaz.sn | Tél : +221 77 000 00 00", 14, 30);

  // Document Title
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(`Rapport Analytique : ${title}`, 14, 45);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text(`Généré le : ${today()}`, 14, 51);

  // Separator line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(14, 55, pageWidth - 14, 55);

  // ── Table ────────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 62,
    head: [headers],
    body: rows.map((r) => r.map(String)),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      textColor: [60, 60, 60],
      lineColor: [230, 230, 230],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [248, 250, 248],
      textColor: [26, 46, 28],
      fontStyle: "bold",
      lineColor: [200, 215, 200],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [253, 253, 253] },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  });

  // ── Footer ───────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document interne strictement confidentiel – CRPAZ © ${new Date().getFullYear()}`,
      14,
      pageHeight - 9
    );
    doc.text(
      `Page ${i} / ${pageCount}`,
      pageWidth - 25,
      pageHeight - 9
    );
  }
  return doc;
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${fileDate()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Report definitions ───────────────────────────────────────────────────────

type ReportDef = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  category: "crm" | "production" | "logistique" | "finance";
  fetch: () => Promise<{ headers: string[]; rows: (string | number)[][] }>;
};

const CATEGORIES = [
  { id: "all", label: "Tous les rapports" },
  { id: "crm", label: "Membres & CRM" },
  { id: "production", label: "Production" },
  { id: "logistique", label: "Logistique" },
  { id: "finance", label: "Finance & Ventes" },
];

const REPORTS: ReportDef[] = [
  {
    id: "producteurs",
    title: "Membres & Producteurs",
    description: "Liste complète des membres avec localisation, superficie et cultures",
    icon: Users,
    color: "emerald",
    category: "crm",
    fetch: async () => {
      const { data, error } = await supabase
        .from("producteurs")
        .select("nom, telephone, localisation, superficie, cultures, certification, created_at")
        .order("nom");
      if (error) throw error;
      const rows = (data || []).map((p: any) => [
        p.nom,
        p.telephone || "—",
        p.localisation || "—",
        `${p.superficie ?? 0} ha`,
        (p.cultures || []).join(", ") || "—",
        p.certification || "—",
        p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "—",
      ]);
      return {
        headers: ["Nom", "Téléphone", "Localisation", "Superficie", "Cultures", "Certification", "Membre depuis"],
        rows,
      };
    },
  },
  {
    id: "recoltes",
    title: "Récoltes",
    description: "Historique des récoltes par produit, quantité et qualité",
    icon: Sprout,
    color: "green",
    category: "production",
    fetch: async () => {
      const { data, error } = await supabase
        .from("recoltes")
        .select("produit, quantite, unite, qualite, date_disponibilite, producteurs(nom)")
        .order("date_disponibilite", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((r: any) => [
        r.produit,
        r.quantite,
        r.unite,
        r.qualite,
        r.date_disponibilite ? format(new Date(r.date_disponibilite), "dd/MM/yyyy") : "—",
        r.producteurs?.nom || "—",
      ]);
      return {
        headers: ["Produit", "Quantité", "Unité", "Qualité", "Date dispo", "Producteur"],
        rows,
      };
    },
  },
  {
    id: "stocks",
    title: "Stocks",
    description: "État des stocks disponibles, réservés et vendus",
    icon: Package,
    color: "blue",
    category: "logistique",
    fetch: async () => {
      const { data, error } = await supabase
        .from("stocks")
        .select("produit_nom, quantite_disponible, quantite_reservee, quantite_vendue, unite, updated_at")
        .order("produit_nom");
      if (error) throw error;
      const rows = (data || []).map((s: any) => [
        s.produit_nom,
        `${s.quantite_disponible ?? 0} ${s.unite}`,
        `${s.quantite_reservee ?? 0} ${s.unite}`,
        `${s.quantite_vendue ?? 0} ${s.unite}`,
        s.updated_at ? format(new Date(s.updated_at), "dd/MM/yyyy") : "—",
      ]);
      return {
        headers: ["Produit", "Disponible", "Réservé", "Vendu", "Mis à jour le"],
        rows,
      };
    },
  },
  {
    id: "commandes",
    title: "Commandes",
    description: "Toutes les commandes internes avec statut et montant",
    icon: ShoppingCart,
    color: "amber",
    category: "finance",
    fetch: async () => {
      const { data, error } = await supabase
        .from("commandes")
        .select("created_at, produit_nom, quantite, unite, statut, montant, lieu_livraison, mode_paiement, profiles(full_name, entreprise)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((c: any) => [
        c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy") : "—",
        (c.profiles as any)?.full_name || (c.profiles as any)?.entreprise || "—",
        c.produit_nom,
        `${c.quantite} ${c.unite}`,
        c.statut,
        c.montant ? `${Number(c.montant).toLocaleString("fr-FR")} CFA` : "—",
        c.lieu_livraison || "—",
        c.mode_paiement || "—",
      ]);
      return {
        headers: ["Date", "Client", "Produit", "Quantité", "Statut", "Montant", "Lieu livraison", "Paiement"],
        rows,
      };
    },
  },
  {
    id: "demandes",
    title: "Demandes Site Web",
    description: "Leads reçus depuis le formulaire public du site",
    icon: Inbox,
    color: "violet",
    category: "crm",
    fetch: async () => {
      const { data, error } = await (supabase as any)
        .from("demandes")
        .select("created_at, nom, email, telephone, entreprise, produit, quantite, statut, message")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((d: any) => [
        d.created_at ? format(new Date(d.created_at), "dd/MM/yyyy") : "—",
        d.nom || "—",
        d.email || "—",
        d.telephone || "—",
        d.entreprise || "—",
        d.produit || "—",
        d.quantite || "—",
        d.statut || "—",
      ]);
      return {
        headers: ["Date", "Nom", "Email", "Téléphone", "Entreprise", "Produit", "Quantité", "Statut"],
        rows,
      };
    },
  },
  {
    id: "prix-marche",
    title: "Prix du Marché",
    description: "Historique des relevés de prix par produit et marché",
    icon: Coins,
    color: "orange",
    category: "production",
    fetch: async () => {
      const { data, error } = await supabase
        .from("prix_marche")
        .select("date_releve, produit, marche, prix, unite_prix, tendance, source")
        .order("date_releve", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((p: any) => [
        p.date_releve ? format(new Date(p.date_releve), "dd/MM/yyyy") : "—",
        p.produit,
        p.marche,
        `${Number(p.prix).toLocaleString("fr-FR")} ${p.unite_prix}`,
        p.tendance || "—",
        p.source || "—",
      ]);
      return {
        headers: ["Date", "Produit", "Marché", "Prix", "Tendance", "Source"],
        rows,
      };
    },
  },
  {
    id: "cotisations",
    title: "Cotisations",
    description: "Paiements de cotisations des membres par période",
    icon: PiggyBank,
    color: "pink",
    category: "finance",
    fetch: async () => {
      const { data, error } = await supabase
        .from("cotisations")
        .select("date_paiement, periode, montant, mode_paiement, statut, notes, producteurs(nom)")
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((c: any) => [
        c.date_paiement ? format(new Date(c.date_paiement), "dd/MM/yyyy") : "—",
        (c.producteurs as any)?.nom || "—",
        c.periode,
        `${Number(c.montant).toLocaleString("fr-FR")} CFA`,
        c.mode_paiement || "—",
        c.statut,
        c.notes || "—",
      ]);
      return {
        headers: ["Date", "Membre", "Période", "Montant", "Mode paiement", "Statut", "Notes"],
        rows,
      };
    },
  },
  {
    id: "tresorerie",
    title: "Trésorerie",
    description: "Mouvements de caisse : entrées, sorties et soldes",
    icon: Wallet,
    color: "teal",
    category: "finance",
    fetch: async () => {
      const { data, error } = await supabase
        .from("tresorerie")
        .select("date_mouvement, type, categorie, libelle, montant, solde_apres, mode_paiement, reference")
        .order("date_mouvement", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((t: any) => [
        t.date_mouvement ? format(new Date(t.date_mouvement), "dd/MM/yyyy") : "—",
        t.type,
        t.categorie,
        t.libelle,
        `${Number(t.montant).toLocaleString("fr-FR")} CFA`,
        `${Number(t.solde_apres ?? 0).toLocaleString("fr-FR")} CFA`,
        t.mode_paiement || "—",
        t.reference || "—",
      ]);
      return {
        headers: ["Date", "Type", "Catégorie", "Libellé", "Montant", "Solde après", "Mode", "Référence"],
        rows,
      };
    },
  },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; badge: string }> = {
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/15", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  green:   { bg: "bg-green-50 dark:bg-green-900/15",     icon: "text-green-600",   badge: "bg-green-100 text-green-700" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/15",       icon: "text-blue-600",    badge: "bg-blue-100 text-blue-700" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/15",     icon: "text-amber-600",   badge: "bg-amber-100 text-amber-700" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/15",   icon: "text-violet-600",  badge: "bg-violet-100 text-violet-700" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-900/15",   icon: "text-orange-600",  badge: "bg-orange-100 text-orange-700" },
  pink:    { bg: "bg-pink-50 dark:bg-pink-900/15",       icon: "text-pink-600",    badge: "bg-pink-100 text-pink-700" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-900/15",       icon: "text-teal-600",    badge: "bg-teal-100 text-teal-700" },
};

// ─── Component ────────────────────────────────────────────────────────────────

const Rapports = () => {
  const [downloading, setDownloading] = useState<Record<string, "pdf" | "csv" | "preview" | null>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const handlePreview = async (report: ReportDef) => {
    setDownloading((prev) => ({ ...prev, [report.id]: "preview" }));
    try {
      const { headers, rows } = await report.fetch();
      const doc = buildPDF(report.title, headers, rows);
      const blobUrl = doc.output("bloburl");
      window.open(blobUrl.toString(), "_blank");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération de l'aperçu");
    } finally {
      setDownloading((prev) => ({ ...prev, [report.id]: null }));
    }
  };

  const handleDownload = async (report: ReportDef, format: "pdf" | "csv") => {
    setDownloading((prev) => ({ ...prev, [report.id]: format }));
    try {
      const { headers, rows } = await report.fetch();

      if (format === "pdf") {
        const doc = buildPDF(report.title, headers, rows);
        doc.save(`CRPAZ_${report.id}_${fileDate()}.pdf`);
      } else {
        downloadCSV(`CRPAZ_${report.id}`, headers, rows);
      }

      setDone((prev) => ({ ...prev, [report.id]: true }));
      setTimeout(() => setDone((prev) => ({ ...prev, [report.id]: false })), 3000);
      toast.success(`Rapport « ${report.title} » téléchargé`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du rapport");
    } finally {
      setDownloading((prev) => ({ ...prev, [report.id]: null }));
    }
  };

  return (
    <DashboardLayout
      title="Rapports d'activité"
      subtitle="Téléchargez les rapports de chaque section au format PDF ou CSV pour vos partenaires"
    >
      {/* ── Toolbar: Search & Filters ────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          <Input 
            type="text" 
            placeholder="Rechercher un rapport..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-white dark:bg-[#131d2e] border-gray-100 dark:border-[#1e2d45] rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-400 font-medium"
          />
        </div>

        <div className="flex items-center p-1.5 bg-gray-100/50 dark:bg-white/[0.03] rounded-2xl border border-gray-100/50 dark:border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-white dark:bg-emerald-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/[0.05]"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-8 flex items-start gap-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/20 rounded-2xl px-5 py-4 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/15">
        <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
          <FileText size={20} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Génération en temps réel</h4>
          <p className="text-xs text-emerald-800/70 dark:text-emerald-400/70 mt-0.5 leading-relaxed">
            Chaque rapport est extrait instantanément depuis la base de données sécurisée de la coopérative. 
            Les exports PDF incluent le cachet officiel et sont optimisés pour l'impression.
          </p>
        </div>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {REPORTS.filter(r => {
          const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               r.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory = activeCategory === "all" || r.category === activeCategory;
          return matchesSearch && matchesCategory;
        }).map((report) => {
          const c = COLOR_MAP[report.color] || COLOR_MAP.emerald;
          const Icon = report.icon;
          const isLoading = !!downloading[report.id];
          const isDone = done[report.id];

          return (
            <div
              key={report.id}
              className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-emerald-500/20 group/card"
            >
              {/* Card header */}
              <div className={`p-5 ${c.bg} transition-colors group-hover/card:bg-opacity-80`}>
                <div className={`w-10 h-10 rounded-xl bg-white dark:bg-[#131d2e] flex items-center justify-center shadow-sm mb-3 group-hover/card:scale-110 transition-transform`}>
                  <Icon size={18} className={c.icon} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{report.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{report.description}</p>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 mt-auto flex flex-col gap-2">
                {isDone ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold w-full justify-center py-1">
                    <CheckCircle2 size={14} />
                    Téléchargé
                  </div>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5 font-medium hover:bg-gray-200 dark:hover:bg-[#1e2d45]"
                      disabled={isLoading}
                      onClick={() => handlePreview(report)}
                    >
                      {isLoading && downloading[report.id] === "preview"
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Eye size={12} />
                      }
                      Aperçu
                    </Button>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5 border-gray-200 dark:border-[#1e2d45] hover:border-[#1A2E1C] hover:text-[#1A2E1C] transition-colors"
                        disabled={isLoading}
                        onClick={() => handleDownload(report, "pdf")}
                      >
                        {isLoading && downloading[report.id] === "pdf"
                          ? <Loader2 size={12} className="animate-spin" />
                          : <FileText size={12} />
                        }
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5 border-gray-200 dark:border-[#1e2d45] hover:border-[#1A2E1C] hover:text-[#1A2E1C] transition-colors"
                        disabled={isLoading}
                        onClick={() => handleDownload(report, "csv")}
                      >
                        {isLoading && downloading[report.id] === "csv"
                          ? <Loader2 size={12} className="animate-spin" />
                          : <FileDown size={12} />
                        }
                        CSV
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {REPORTS.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             r.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === "all" || r.category === activeCategory;
        return matchesSearch && matchesCategory;
      }).length === 0 && (
        <div className="py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-white/[0.02] flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-white/5">
            <Search size={24} className="text-gray-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Aucun rapport trouvé</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Essayez de modifier vos critères de recherche ou de changer de catégorie.
          </p>
        </div>
      )}

      {/* Tip */}
      <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
        Les fichiers PDF sont protégés et prêts à l'impression. Les fichiers CSV peuvent être importés dans Excel ou Google Sheets.
      </p>
    </DashboardLayout>
  );
};

export default Rapports;
