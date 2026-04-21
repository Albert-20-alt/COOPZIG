import { useState } from "react";
import {
  FileDown, FileText, Users, Sprout, Package,
  ShoppingCart, Coins, PiggyBank, Wallet, Inbox,
  Loader2, CheckCircle2,
} from "lucide-react";
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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(26, 46, 28);
  doc.rect(0, 0, 210, 28, "F");

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("CRPAZ – Coopérative de Ziguinchor", 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 230, 185);
  doc.text(`Rapport : ${title}`, 14, 19);
  doc.text(`Généré le ${today()}`, 14, 24.5);

  // ── Table ────────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 34,
    head: [headers],
    body: rows.map((r) => r.map(String)),
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      valign: "middle",
    },
    headStyles: {
      fillColor: [26, 46, 28],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [247, 250, 247] },
    tableLineColor: [220, 235, 220],
    tableLineWidth: 0.1,
    margin: { left: 14, right: 14 },
  });

  // ── Footer ───────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Document confidentiel – CRPAZ © ${new Date().getFullYear()}   |   Page ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 7,
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
  fetch: () => Promise<{ headers: string[]; rows: (string | number)[][] }>;
};

const REPORTS: ReportDef[] = [
  {
    id: "producteurs",
    title: "Membres & Producteurs",
    description: "Liste complète des membres avec localisation, superficie et cultures",
    icon: Users,
    color: "emerald",
    fetch: async () => {
      const { data, error } = await supabase
        .from("producteurs")
        .select("nom, localisation, superficie, cultures, certification, created_at")
        .order("nom");
      if (error) throw error;
      const rows = (data || []).map((p: any) => [
        p.nom,
        p.localisation || "—",
        `${p.superficie ?? 0} ha`,
        (p.cultures || []).join(", ") || "—",
        p.certification || "—",
        p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "—",
      ]);
      return {
        headers: ["Nom", "Localisation", "Superficie", "Cultures", "Certification", "Membre depuis"],
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
  const [downloading, setDownloading] = useState<Record<string, "pdf" | "csv" | null>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

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
      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-4 py-3">
        <FileText size={16} className="text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          Chaque rapport est généré en temps réel depuis la base de données. Le PDF inclut l'entête de la coopérative et est prêt à être transmis à vos partenaires.
        </p>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {REPORTS.map((report) => {
          const c = COLOR_MAP[report.color] || COLOR_MAP.emerald;
          const Icon = report.icon;
          const isLoading = !!downloading[report.id];
          const isDone = done[report.id];

          return (
            <div
              key={report.id}
              className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden flex flex-col"
            >
              {/* Card header */}
              <div className={`p-5 ${c.bg}`}>
                <div className={`w-10 h-10 rounded-xl bg-white dark:bg-[#131d2e] flex items-center justify-center shadow-sm mb-3`}>
                  <Icon size={18} className={c.icon} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{report.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{report.description}</p>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 mt-auto flex gap-2">
                {isDone ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold w-full justify-center py-1">
                    <CheckCircle2 size={14} />
                    Téléchargé
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
        Les fichiers PDF sont protégés et prêts à l'impression. Les fichiers CSV peuvent être importés dans Excel ou Google Sheets.
      </p>
    </DashboardLayout>
  );
};

export default Rapports;
