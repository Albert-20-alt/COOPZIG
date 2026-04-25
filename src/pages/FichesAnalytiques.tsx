import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, Save, Loader2, ArrowLeft, Trash2,
  CheckCircle2, Archive, AlertTriangle, Download,
  ChevronDown, ChevronUp, Search, Eye, Pencil, X,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChargeItem = {
  code: string;
  nom: string;
  pct_defaut: number;
  montant_unitaire: number;
};

type Fiche = {
  id: string;
  produit: string;
  code_produit: string;
  campagne: string;
  date_fiche: string;
  variete: string;
  superficie: number;
  zone: string;
  prix_unitaire: number;
  id_producteur_externe: string;
  quantite_totale: number;
  contacts: string;
  producteur_id: string | null;
  producteurs_noms: string[];
  charges_variables: ChargeItem[];
  charges_fixes: ChargeItem[];
  couts_commercialisation: ChargeItem[];
  taux_taxes: number;
  taux_commission_producteur: number;
  taux_commission_etaam: number;
  taux_commission_cooperative: number;
  statut: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

// ─── Default charge items (matching the Excel template exactly) ───────────────
const DEFAULT_CHV: ChargeItem[] = [
  { code: "CHV 1", nom: "Plants",                   pct_defaut: 2,   montant_unitaire: 0 },
  { code: "CHV 2", nom: "Sanitaire",                pct_defaut: 3,   montant_unitaire: 0 },
  { code: "CHV 3", nom: "Clôture",                  pct_defaut: 2,   montant_unitaire: 0 },
  { code: "CHV 4", nom: "Irrigation",               pct_defaut: 3,   montant_unitaire: 0 },
  { code: "CHV 5", nom: "Main d'œuvre",             pct_defaut: 5,   montant_unitaire: 0 },
  { code: "CHV 6", nom: "Transport interne",        pct_defaut: 2.5, montant_unitaire: 0 },
  { code: "CHV 7", nom: "Autres charges variables", pct_defaut: 2.5, montant_unitaire: 0 },
];
const DEFAULT_CHF: ChargeItem[] = [
  { code: "CHF 1", nom: "Salaires (personnel permanent)", pct_defaut: 10, montant_unitaire: 0 },
  { code: "CHF 2", nom: "Équipements agricoles",         pct_defaut: 3,  montant_unitaire: 0 },
  { code: "CHF 3", nom: "Entretien matériel",            pct_defaut: 2,  montant_unitaire: 0 },
  { code: "CHF 4", nom: "Charges administratives",       pct_defaut: 5,  montant_unitaire: 0 },
];
const DEFAULT_CM: ChargeItem[] = [
  { code: "CM 1", nom: "Transport vers marché",    pct_defaut: 2, montant_unitaire: 0 },
  { code: "CM 2", nom: "Emballage",               pct_defaut: 2, montant_unitaire: 0 },
  { code: "CM 3", nom: "Conservation / stockage", pct_defaut: 2, montant_unitaire: 0 },
  { code: "CM 4", nom: "Commission intermédiaires",pct_defaut: 1, montant_unitaire: 0 },
  { code: "CM 5", nom: "Communication / marketing",pct_defaut: 3, montant_unitaire: 0 },
];

const newFiche = (): Omit<Fiche, "id" | "created_at" | "updated_at"> => ({
  produit: "",
  code_produit: "",
  campagne: String(new Date().getFullYear()),
  date_fiche: new Date().toISOString().slice(0, 10),
  variete: "",
  superficie: 0,
  zone: "",
  prix_unitaire: 0,
  id_producteur_externe: "",
  quantite_totale: 0,
  contacts: "",
  producteur_id: null,
  producteurs_noms: [],
  charges_variables: DEFAULT_CHV.map((c) => ({ ...c })),
  charges_fixes: DEFAULT_CHF.map((c) => ({ ...c })),
  couts_commercialisation: DEFAULT_CM.map((c) => ({ ...c })),
  taux_taxes: 0.05,
  taux_commission_producteur: 0.60,
  taux_commission_etaam: 0.25,
  taux_commission_cooperative: 0.10,
  statut: "brouillon",
  notes: "",
});

// ─── Calculation engine ───────────────────────────────────────────────────────
function calcItems(items: ChargeItem[], prix: number, qte: number) {
  return items.map((item) => {
    const mu = item.montant_unitaire > 0
      ? item.montant_unitaire
      : Math.round(prix * item.pct_defaut / 100);
    return { ...item, montant_unitaire: mu, montant_total: mu * qte };
  });
}

function calcSummary(f: Partial<Fiche>) {
  const px = Number(f.prix_unitaire) || 0;
  const qt = Number(f.quantite_totale) || 0;

  const d1_items = calcItems(f.charges_variables || [], px, qt);
  const d2_items = calcItems(f.charges_fixes || [], px, qt);
  const d3_items = calcItems(f.couts_commercialisation || [], px, qt);

  const d1_u = d1_items.reduce((s, i) => s + i.montant_unitaire, 0);
  const d2_u = d2_items.reduce((s, i) => s + i.montant_unitaire, 0);
  const d3_u = d3_items.reduce((s, i) => s + i.montant_unitaire, 0);

  const d1_t = d1_u * qt;
  const d2_t = d2_u * qt;
  const d3_t = d3_u * qt;

  const cout_u = d1_u + d2_u + d3_u;
  const cout_t = cout_u * qt;
  const d4_u   = px;
  const d4_t   = px * qt;
  const mb_u   = d4_u - d1_u;
  const mb_t   = mb_u * qt;
  const res_u  = d4_u - cout_u;
  const res_t  = res_u * qt;

  const taux_res = d4_u > 0 ? res_u / d4_u : 0;
  const taux_mb  = d4_u > 0 ? mb_u  / d4_u : 0;
  const taux_cout = d4_u > 0 ? cout_u / d4_u : 0;

  const cap_d1 = px * 0.20;
  const cap_d2 = px * 0.20;
  const cap_d3 = px * 0.10;

  const tax_t   = res_t * (f.taux_taxes ?? 0.05);
  const cp_t    = res_t * (f.taux_commission_producteur ?? 0.60);
  const ce_t    = res_t * (f.taux_commission_etaam ?? 0.25);
  const coop_t  = res_t * (f.taux_commission_cooperative ?? 0.10);
  const tax_u   = res_u * (f.taux_taxes ?? 0.05);
  const cp_u    = res_u * (f.taux_commission_producteur ?? 0.60);
  const ce_u    = res_u * (f.taux_commission_etaam ?? 0.25);
  const coop_u  = res_u * (f.taux_commission_cooperative ?? 0.10);

  return {
    d1_items, d2_items, d3_items,
    d1_u, d2_u, d3_u, d1_t, d2_t, d3_t,
    cout_u, cout_t, d4_u, d4_t,
    mb_u, mb_t, res_u, res_t,
    taux_cout, taux_mb, taux_res,
    cap_d1, cap_d2, cap_d3,
    tax_u, cp_u, ce_u, coop_u, tax_t, cp_t, ce_t, coop_t,
  };
}

// ─── Number formatting ────────────────────────────────────────────────────────
const N = (v: number) => Math.round(v).toLocaleString("fr-FR");
const P = (v: number) => `${(v * 100).toFixed(0)}%`;

// ─── Badge per statut ─────────────────────────────────────────────────────────
const statutBadge = (s: string) =>
  s === "validé"   ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Validée</Badge> :
  s === "archivé"  ? <Badge className="bg-gray-100 text-gray-500 border-gray-200">Archivée</Badge> :
                     <Badge className="bg-amber-100 text-amber-700 border-amber-200">Brouillon</Badge>;

// ─── Section header ───────────────────────────────────────────────────────────
const SH = ({ label, sub, cap, total, px }: { label: string; sub: string; cap: number; total: number; px: number }) => {
  const over = total > cap && cap > 0;
  return (
    <div className="rounded-xl overflow-hidden mb-1">
      <div className="bg-[#1A2E1C] text-white px-4 py-2.5 flex items-center justify-between">
        <span className="font-bold text-sm">{label}</span>
        {cap > 0 && px > 0 && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${over ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            {over ? "⚠ Dépassement" : "✓ Dans les limites"} — max {sub}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Charge table ─────────────────────────────────────────────────────────────
const ChargeTable = ({
  items, px, qt, onUpdate, onAdd, onRemove, cap, totalLabel,
}: {
  items: ChargeItem[]; px: number; qt: number;
  onUpdate: (idx: number, field: keyof ChargeItem, val: any) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  cap: number;
  totalLabel: string;
}) => {
  const calc = calcItems(items, px, qt);
  const totalU = calc.reduce((s, i) => s + i.montant_unitaire, 0);
  const totalT = totalU * qt;
  const over = cap > 0 && px > 0 && totalU > cap;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-[#1e2d45]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <th className="text-left px-4 py-2.5 font-semibold text-xs w-[30%]">Nomenclature poste</th>
            <th className="text-left px-3 py-2.5 font-semibold text-xs w-[18%]">Code poste</th>
            <th className="text-right px-3 py-2.5 font-semibold text-xs w-[17%]">% effectif</th>
            <th className="text-right px-3 py-2.5 font-semibold text-xs w-[17%]">Montant/kg (CFA)</th>
            <th className="text-right px-3 py-2.5 font-semibold text-xs w-[18%] pr-4">Montant total (CFA)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-[#1e2d45]">
          {calc.map((item, i) => (
            <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
              <td className="px-4 py-2">
                <Input
                  value={item.nom}
                  onChange={(e) => onUpdate(i, "nom", e.target.value)}
                  className="h-7 text-xs border-0 bg-transparent p-0 focus:bg-white dark:focus:bg-[#1e2d45] focus:border focus:border-gray-200 rounded px-2"
                />
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <Input
                    value={item.code}
                    onChange={(e) => onUpdate(i, "code", e.target.value)}
                    className="h-7 text-xs border-0 bg-transparent p-0 focus:bg-white dark:focus:bg-[#1e2d45] focus:border rounded px-2 w-16"
                  />
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">({item.pct_defaut}%)</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <span className="text-xs text-gray-500">
                  {px > 0 ? `${((item.montant_unitaire / px) * 100).toFixed(1)}%` : "—"}
                </span>
              </td>
              <td className="px-3 py-2">
                <Input
                  type="number"
                  value={item.montant_unitaire || ""}
                  onChange={(e) => onUpdate(i, "montant_unitaire", Number(e.target.value))}
                  placeholder={px > 0 ? String(Math.round(px * item.pct_defaut / 100)) : "0"}
                  className="h-7 text-xs text-right border border-gray-200 dark:border-[#1e2d45] rounded-lg bg-white dark:bg-[#131d2e]"
                />
              </td>
              <td className="px-3 py-2 pr-4 text-right font-semibold text-gray-800 dark:text-gray-200">
                <div className="flex items-center justify-end gap-2">
                  <span>{N(item.montant_total)}</span>
                  <button onClick={() => onRemove(i)} className="text-red-300 hover:text-red-500 transition-colors ml-1">
                    <Trash2 size={11} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={`${over ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" : "bg-slate-50 dark:bg-[#131d2e] text-slate-800 dark:text-slate-200"} font-bold border-t border-slate-200 dark:border-slate-700`}>
            <td className="px-4 py-3 text-sm">{totalLabel}</td>
            <td className="px-3 py-3 text-center">
              <button onClick={onAdd} className="text-[10px] bg-white dark:bg-[#1e2d45] border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-2 py-1 transition-colors text-slate-600 dark:text-slate-300">
                + Ajouter
              </button>
            </td>
            <td className="px-3 py-3 text-right text-sm">{px > 0 ? `${((totalU / px) * 100).toFixed(0)}%` : "0%"}</td>
            <td className="px-3 py-3 text-center">
              <span className={`${over ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"} px-3 py-1 rounded font-bold text-sm`}>{N(totalU)}</span>
            </td>
            <td className="px-3 py-3 pr-4 text-right text-base">{N(totalT)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(f: Fiche, s: ReturnType<typeof calcSummary>) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const ML = 12; const MR = 12;
  const TW = W - ML - MR;

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(26, 46, 28);
  doc.rect(0, 0, W, 38, "F");

  // Left: logo placeholder circle
  doc.setFillColor(16, 185, 129);
  doc.circle(ML + 9, 19, 8, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(255,255,255);
  doc.text("ETAAM", ML + 9, 21, { align: "center" });

  // Center: title block
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255,255,255);
  doc.text("COOPÉRATIVE RÉGIONALE DES PLANTEURS ET AGRICULTEURS DE ZIGUINCHOR", W/2, 11, { align: "center" });
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
  doc.text("CoopZig Ziguinchor-Casamance  •  ETAAM", W/2, 17, { align: "center" });
  doc.setFontSize(9.5); doc.setFont("helvetica", "bold");
  doc.text("FICHE ANALYTIQUE DES ÉLÉMENTS DE DÉPENSES ET RECETTES", W/2, 25, { align: "center" });

  // Right: campagne + statut badge
  const statutColor: [number,number,number] = f.statut === "validé" ? [16,185,129] : f.statut === "archivé" ? [107,114,128] : [245,158,11];
  doc.setFillColor(...statutColor);
  doc.roundedRect(W - MR - 28, 10, 28, 8, 2, 2, "F");
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(255,255,255);
  doc.text(f.statut.toUpperCase(), W - MR - 14, 15, { align: "center" });
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(200,230,200);
  doc.text(`Campagne ${f.campagne}`, W - MR - 14, 23, { align: "center" });
  doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy")}`, W - MR - 14, 29, { align: "center" });

  doc.setTextColor(0,0,0);

  // ── Product info table ─────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 42,
    body: [
      [
        { content: "Produit",         styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, f.produit,
        { content: "Code",            styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, f.code_produit || "—",
        { content: "Variété",         styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, f.variete || "—",
      ],
      [
        { content: "Date fiche",      styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, f.date_fiche ? format(new Date(f.date_fiche), "dd/MM/yyyy") : "—",
        { content: "Campagne",        styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, f.campagne,
        { content: "Zone / Superficie",styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, `${f.zone || "—"}  /  ${f.superficie} ha`,
      ],
      [
        { content: "Prix unitaire",   styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, `${N(f.prix_unitaire)} CFA/kg`,
        { content: "Quantité totale", styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, `${N(f.quantite_totale)} kg`,
        { content: "Contacts",        styles: { fontStyle: "bold", fillColor: [240,247,240] as [number,number,number] } }, f.contacts || "—",
      ],
      ...(f.producteurs_noms?.length > 0 ? [[
        { content: f.producteurs_noms.length > 1 ? `Producteurs (vente groupée — ${f.producteurs_noms.length})` : "Producteur",
          styles: { fontStyle: "bold", fillColor: [220,240,220] as [number,number,number] } },
        { content: f.producteurs_noms.join("  •  "), colSpan: 5,
          styles: { fontStyle: "bold", fillColor: [240,252,240] as [number,number,number], textColor: [39,78,19] as [number,number,number] } },
      ]] : []),
    ],
    styles: { fontSize: 8, cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 } },
    columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 30 }, 2: { cellWidth: 24 }, 3: { cellWidth: 22 }, 4: { cellWidth: 26 }, 5: { cellWidth: TW - 128 } },
    theme: "grid",
    tableLineColor: [210, 230, 210],
    tableLineWidth: 0.15,
    margin: { left: ML, right: MR },
  });

  let y = (doc as any).lastAutoTable.finalY + 5;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const sectionBand = (posY: number, title: string, color: [number,number,number] = [26,46,28]) => {
    doc.setFillColor(...color);
    doc.rect(ML, posY, TW, 7.5, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255,255,255);
    doc.text(title, W/2, posY + 5.2, { align: "center" });
    doc.setTextColor(0,0,0);
    return posY + 10;
  };

  const subBand = (posY: number, title: string) => {
    doc.setFillColor(216, 234, 216);
    doc.rect(ML, posY, TW, 6, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(39, 78, 19);
    doc.text(title, W/2, posY + 4.2, { align: "center" });
    doc.setTextColor(0,0,0);
    return posY + 8;
  };

  const limitBand = (posY: number, title: string, over: boolean) => {
    const bg: [number,number,number] = over ? [254,226,226] : [219,234,254];
    const fg: [number,number,number] = over ? [185,28,28] : [29,78,216];
    doc.setFillColor(...bg);
    doc.rect(ML, posY, TW, 5.5, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(...fg);
    doc.text(title, W/2, posY + 3.8, { align: "center" });
    doc.setTextColor(0,0,0);
    return posY + 7.5;
  };

  const renderChargeTable = (
    startY: number,
    items: (ChargeItem & { montant_total: number })[],
    totalLabel: string, totalU: number, totalT: number, over: boolean
  ) => {
    const head = [["Nomenclature poste", "Code poste", "% effectif", "CFA / kg", "Montant total (CFA)"]];
    const body = items.map((it) => [
      it.nom,
      `${it.code}  (${it.pct_defaut}% déf.)`,
      f.prix_unitaire > 0 ? `${((it.montant_unitaire / f.prix_unitaire) * 100).toFixed(1)}%` : "—",
      N(it.montant_unitaire),
      N(it.montant_total),
    ]);
    const footBg: [number,number,number] = over ? [185,28,28] : [21,128,61];

    autoTable(doc, {
      startY,
      head,
      body,
      foot: [[
        { content: `TOTAL  ${totalLabel}`, styles: { fillColor: footBg, textColor: [255,255,255] as [number,number,number], fontStyle: "bold" } },
        { content: "",                     styles: { fillColor: footBg } },
        { content: f.prix_unitaire > 0 ? `${((totalU/f.prix_unitaire)*100).toFixed(0)}%` : "0%",
          styles: { fillColor: [234,179,8] as [number,number,number], textColor: [0,0,0] as [number,number,number], fontStyle: "bold", halign: "center" } },
        { content: N(totalU),
          styles: { fillColor: [254,249,195] as [number,number,number], textColor: [0,0,0] as [number,number,number], fontStyle: "bold", halign: "right" } },
        { content: N(totalT), styles: { fillColor: footBg, textColor: [255,255,255] as [number,number,number], fontStyle: "bold", halign: "right" } },
      ]],
      styles: { fontSize: 8, cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 } },
      headStyles: { fillColor: [30,64,175] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248,250,252] as [number,number,number] },
      columnStyles: {
        0: { cellWidth: 58 },
        1: { cellWidth: 36 },
        2: { halign: "right", cellWidth: 22 },
        3: { halign: "right", cellWidth: 30 },
        4: { halign: "right", fontStyle: "bold", cellWidth: 40 },
      },
      tableLineColor: [209,213,219], tableLineWidth: 0.12,
      margin: { left: ML, right: MR },
    });
    return (doc as any).lastAutoTable.finalY;
  };

  // ── PARTIE I ───────────────────────────────────────────────────────────────
  y = sectionBand(y, "PARTIE I — ÉLÉMENTS DE DÉPENSES");
  y = subBand(y, "D1 — Charges Variables");
  y = limitBand(y, `Déduction permise : max 20% du prix unitaire  (plafond ${N(s.cap_d1)} CFA/kg)`, s.d1_u > s.cap_d1 && f.prix_unitaire > 0);
  y = renderChargeTable(y, s.d1_items, "D1", s.d1_u, s.d1_t, s.d1_u > s.cap_d1 && f.prix_unitaire > 0) + 4;

  y = subBand(y, "D2 — Charges Fixes");
  y = limitBand(y, `Déduction permise : max 20% du prix unitaire  (plafond ${N(s.cap_d2)} CFA/kg)`, s.d2_u > s.cap_d2 && f.prix_unitaire > 0);
  y = renderChargeTable(y, s.d2_items, "D2", s.d2_u, s.d2_t, s.d2_u > s.cap_d2 && f.prix_unitaire > 0) + 4;

  y = subBand(y, "D3 — Coûts de Commercialisation");
  y = limitBand(y, `Déduction permise : max 10% du prix unitaire  (plafond ${N(s.cap_d3)} CFA/kg)`, s.d3_u > s.cap_d3 && f.prix_unitaire > 0);
  y = renderChargeTable(y, s.d3_items, "D3", s.d3_u, s.d3_t, s.d3_u > s.cap_d3 && f.prix_unitaire > 0) + 4;

  // ── Synthèse ───────────────────────────────────────────────────────────────
  y = sectionBand(y, "SYNTHÈSE — RÉSULTATS D'EXPLOITATION", [55, 65, 81]);

  const resColor: [number,number,number] = s.res_t >= 0 ? [21,128,61] : [185,28,28];
  const summaryBody = [
    ["Coût de revient total (D1+D2+D3)", P(s.taux_cout), N(s.cout_u) + " CFA/kg", N(s.cout_t) + " CFA"],
    ["Chiffre d'affaires (D4 = Prix unitaire × Quantité)", P(1), N(s.d4_u) + " CFA/kg", N(s.d4_t) + " CFA"],
    ["Marge brute (D4 – D1)", P(s.taux_mb), N(s.mb_u) + " CFA/kg", N(s.mb_t) + " CFA"],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryBody.map((r, i) => r.map((c, j) => ({
      content: c,
      styles: {
        fontStyle: "bold" as const,
        halign: (j === 0 ? "left" : "right") as "left" | "right",
        fillColor: i % 2 === 0 ? [248,250,252] as [number,number,number] : [255,255,255] as [number,number,number],
        textColor: [30,41,59] as [number,number,number],
      },
    }))),
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 22 }, 2: { cellWidth: 36 }, 3: { cellWidth: 28 } },
    styles: { fontSize: 8.5, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 } },
    tableLineColor: [209,213,219], tableLineWidth: 0.12,
    margin: { left: ML, right: MR },
    showHead: false,
    showFoot: false,
  });

  y = (doc as any).lastAutoTable.finalY;

  // Résultat d'exploitation highlighted row
  autoTable(doc, {
    startY: y,
    body: [[
      { content: "RÉSULTAT D'EXPLOITATION  (D4 – D1 – D2 – D3)", styles: { fontStyle: "bold", fillColor: resColor, textColor: [255,255,255] as [number,number,number], halign: "left" } },
      { content: P(s.taux_res), styles: { fontStyle: "bold", fillColor: resColor, textColor: [255,255,255] as [number,number,number], halign: "right" } },
      { content: N(s.res_u) + " CFA/kg", styles: { fontStyle: "bold", fillColor: resColor, textColor: [255,255,255] as [number,number,number], halign: "right" } },
      { content: N(s.res_t) + " CFA", styles: { fontStyle: "bold", fillColor: resColor, textColor: [255,255,255] as [number,number,number], halign: "right", fontSize: 10 } },
    ]],
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 22 }, 2: { cellWidth: 36 }, 3: { cellWidth: 28 } },
    styles: { fontSize: 9, cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
    tableLineColor: resColor, tableLineWidth: 0.2,
    margin: { left: ML, right: MR },
    showHead: false, showFoot: false,
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ── PARTIE 2 ───────────────────────────────────────────────────────────────
  y = sectionBand(y, `PARTIE 2 — DISTRIBUTION DU RÉSULTAT D'EXPLOITATION  (${N(s.res_t)} CFA)`);

  autoTable(doc, {
    startY: y,
    head: [["Nomenclature poste", "Code", "Taux", "CFA / kg", "Montant total (CFA)"]],
    body: [
      ["TAXES (À traiter)",          "TX", P(f.taux_taxes),                         N(s.tax_u),  N(s.tax_t)],
      ["COMMISSIONS PRODUCTEUR",     "CP", P(f.taux_commission_producteur),          N(s.cp_u),   N(s.cp_t)],
      ["COMMISSIONS ETAAM",          "CE", P(f.taux_commission_etaam),               N(s.ce_u),   N(s.ce_t)],
      ["COMMISSIONS COOPÉRATIVE",    "CC", P(f.taux_commission_cooperative ?? 0.10), N(s.coop_u), N(s.coop_t)],
    ],
    foot: [[
      { content: "TOTAL DISTRIBUÉ", styles: { fontStyle: "bold", fillColor: [30,64,175] as [number,number,number], textColor: [255,255,255] as [number,number,number] } },
      { content: "", styles: { fillColor: [30,64,175] as [number,number,number] } },
      {
        content: P((f.taux_taxes ?? 0) + (f.taux_commission_producteur ?? 0) + (f.taux_commission_etaam ?? 0) + (f.taux_commission_cooperative ?? 0)),
        styles: { fontStyle: "bold", fillColor: [234,179,8] as [number,number,number], textColor: [0,0,0] as [number,number,number], halign: "right" }
      },
      { content: N(s.tax_u + s.cp_u + s.ce_u + s.coop_u), styles: { fontStyle: "bold", fillColor: [30,64,175] as [number,number,number], textColor: [255,255,255] as [number,number,number], halign: "right" } },
      { content: N(s.tax_t + s.cp_t + s.ce_t + s.coop_t), styles: { fontStyle: "bold", fillColor: [30,64,175] as [number,number,number], textColor: [255,255,255] as [number,number,number], halign: "right" } },
    ]],
    styles: { fontSize: 8.5, cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 } },
    headStyles: { fillColor: [30,64,175] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [240,245,255] as [number,number,number] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 18, halign: "center" },
      2: { halign: "right", cellWidth: 24 },
      3: { halign: "right", cellWidth: 34 },
      4: { halign: "right", fontStyle: "bold", cellWidth: 40 },
    },
    tableLineColor: [209,213,219], tableLineWidth: 0.12,
    margin: { left: ML, right: MR },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Signature block ────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height;
  if (y + 30 > pageH - 18) { doc.addPage(); y = 14; }

  doc.setDrawColor(200, 220, 200); doc.setLineWidth(0.3);
  doc.line(ML, y, W - MR, y);
  y += 5;
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(80,80,80);
  doc.text("Établi par :", ML, y + 4);
  doc.text("Vérifié par :", W/2 - 20, y + 4);
  doc.text("Approuvé par :", W - MR - 50, y + 4);
  doc.setFont("helvetica", "normal"); doc.setTextColor(160,160,160);
  doc.text("Signature & date : _________________________", ML, y + 16);
  doc.text("Signature & date : _________________________", W/2 - 20, y + 16);
  doc.text("Signature & date : _________________________", W - MR - 50, y + 16);

  // ── Footer (all pages) ────────────────────────────────────────────────────
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(26, 46, 28);
    doc.rect(0, pageH - 10, W, 10, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 220, 180);
    doc.text(
      `Document confidentiel – CoopZig / ETAAM © ${new Date().getFullYear()}   •   Fiche : ${f.produit} — Campagne ${f.campagne}   •   Page ${i} / ${pages}`,
      W/2, pageH - 3.5, { align: "center" }
    );
  }

  doc.save(`Fiche_Analytique_${f.produit}_${f.campagne}.pdf`);
}

// ─── Producer Tag Input ───────────────────────────────────────────────────────
const ProducerTagInput = ({
  value, onChange,
}: { value: string[]; onChange: (v: string[]) => void }) => {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="min-h-[36px] flex flex-wrap gap-1.5 items-center border border-input rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#131d2e] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 cursor-text"
      onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
      {value.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium px-2 py-0.5 rounded-full">
          {tag}
          <button type="button" onClick={() => removeTag(i)} className="hover:text-red-500 transition-colors leading-none">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={addTag}
        placeholder={value.length === 0 ? "Nom du producteur… (Entrée pour ajouter)" : "Ajouter…"}
        className="flex-1 min-w-[140px] text-sm bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 py-0.5"
      />
    </div>
  );
};

// ─── Preview Modal ────────────────────────────────────────────────────────────
const PreviewChargeSection = ({
  title, items, px, qt, totalLabel, cap, limitPct,
}: {
  title: string; items: ChargeItem[]; px: number; qt: number;
  totalLabel: string; cap: number; limitPct: string;
}) => {
  const calc = calcItems(items, px, qt);
  const totalU = calc.reduce((s, i) => s + i.montant_unitaire, 0);
  const totalT = totalU * qt;
  const over = cap > 0 && px > 0 && totalU > cap;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${over ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
          {over ? `⚠ Dépasse ${limitPct}` : `✓ Dans limite ${limitPct}`}
        </span>
      </div>
      <div className="rounded-lg overflow-hidden border border-gray-100 dark:border-[#1e2d45]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-3 py-1.5 font-semibold">Désignation</th>
              <th className="text-right px-3 py-1.5 font-semibold">%</th>
              <th className="text-right px-3 py-1.5 font-semibold">CFA/kg</th>
              <th className="text-right px-3 py-1.5 font-semibold">Total CFA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#1e2d45]">
            {calc.map((it, i) => (
              <tr key={i} className="bg-white dark:bg-[#131d2e]">
                <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{it.nom} <span className="text-gray-400">({it.code})</span></td>
                <td className="px-3 py-1.5 text-right text-gray-500">{px > 0 ? `${((it.montant_unitaire / px) * 100).toFixed(1)}%` : "—"}</td>
                <td className="px-3 py-1.5 text-right font-mono text-gray-700 dark:text-gray-300">{N(it.montant_unitaire)}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold text-gray-800 dark:text-gray-200">{N(it.montant_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={`${over ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" : "bg-slate-50 dark:bg-[#131d2e] text-slate-800 dark:text-slate-200"} font-bold border-t border-slate-200 dark:border-slate-700`}>
              <td className="px-3 py-2 text-xs">{totalLabel}</td>
              <td className="px-3 py-2 text-right text-xs">{px > 0 ? `${((totalU / px) * 100).toFixed(0)}%` : "0%"}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{N(totalU)}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{N(totalT)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const FichePreviewModal = ({
  fiche, onClose, onEdit, onExport,
}: {
  fiche: Fiche | null;
  onClose: () => void;
  onEdit: (f: Fiche) => void;
  onExport: (f: Fiche) => void;
}) => {
  if (!fiche) return null;
  const s = calcSummary(fiche);

  const commission4Total =
    (fiche.taux_taxes ?? 0) +
    (fiche.taux_commission_producteur ?? 0) +
    (fiche.taux_commission_etaam ?? 0) +
    (fiche.taux_commission_cooperative ?? 0);

  return (
    <Dialog open={!!fiche} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-0 gap-0 dark:bg-[#0d1525] dark:border-[#1e2d45]">
        {/* Modal header */}
        <div className="bg-[#1A2E1C] text-white px-6 py-4 flex items-start justify-between sticky top-0 z-10">
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
              ETAAM — Coopérative Régionale des Planteurs et Agriculteurs de Ziguinchor
            </p>
            <p className="font-bold text-sm mt-0.5">FICHE ANALYTIQUE DES ÉLÉMENTS DE DÉPENSES ET RECETTES</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs opacity-70">Campagne {fiche.campagne}</span>
              {fiche.statut === "validé"
                ? <Badge className="bg-emerald-500 text-white text-[10px]">Validée</Badge>
                : fiche.statut === "archivé"
                ? <Badge className="bg-gray-500 text-white text-[10px]">Archivée</Badge>
                : <Badge className="bg-amber-500 text-white text-[10px]">Brouillon</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button size="sm" variant="outline"
              className="border-white/20 text-white hover:bg-white/10 h-8 text-xs"
              onClick={() => onExport(fiche)}>
              <Download size={12} className="mr-1" /> PDF
            </Button>
            <Button size="sm" variant="outline"
              className="border-white/20 text-white hover:bg-white/10 h-8 text-xs"
              onClick={() => { onClose(); onEdit(fiche); }}>
              <Pencil size={12} className="mr-1" /> Modifier
            </Button>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Info produit */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              ["Produit",         fiche.produit],
              ["Code produit",    fiche.code_produit || "—"],
              ["Variété",         fiche.variete || "—"],
              ["Campagne",        fiche.campagne],
              ["Date de la fiche",fiche.date_fiche ? format(new Date(fiche.date_fiche), "dd/MM/yyyy") : "—"],
              ["Zone",            fiche.zone || "—"],
              ["Superficie",      `${fiche.superficie} ha`],
              ["Prix unitaire",   `${N(fiche.prix_unitaire)} CFA/kg`],
              ["Quantité totale", `${N(fiche.quantite_totale)} kg`],
              ["Contacts",        fiche.contacts || "—"],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2.5 border border-gray-100 dark:border-[#1e2d45]">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{val}</p>
              </div>
            ))}
          </div>

          {/* Producteurs */}
          {fiche.producteurs_noms?.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg px-4 py-3">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-bold mb-2">
                Producteurs {fiche.producteurs_noms.length > 1 ? `(vente groupée — ${fiche.producteurs_noms.length} producteurs)` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {fiche.producteurs_noms.map((nom, i) => (
                  <span key={i} className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full">
                    {nom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PARTIE I */}
          <div>
            <div className="bg-[#1A2E1C] text-white rounded-lg px-4 py-2 mb-3 text-center">
              <span className="text-xs font-bold tracking-widest uppercase">Partie I — Éléments de Dépenses</span>
            </div>
            <PreviewChargeSection title="D1 — Charges Variables" items={fiche.charges_variables} px={fiche.prix_unitaire} qt={fiche.quantite_totale} totalLabel="TOTAL D1" cap={s.cap_d1} limitPct="20%" />
            <PreviewChargeSection title="D2 — Charges Fixes"     items={fiche.charges_fixes}     px={fiche.prix_unitaire} qt={fiche.quantite_totale} totalLabel="TOTAL D2" cap={s.cap_d2} limitPct="20%" />
            <PreviewChargeSection title="D3 — Coûts de Commercialisation" items={fiche.couts_commercialisation} px={fiche.prix_unitaire} qt={fiche.quantite_totale} totalLabel="TOTAL D3" cap={s.cap_d3} limitPct="10%" />
          </div>

          {/* Synthèse */}
          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-[#1e2d45]">
            <div className="bg-[#1A2E1C] text-white px-4 py-2 text-center">
              <span className="text-xs font-bold tracking-widest uppercase">Synthèse — Résultats d'exploitation</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-[#1e2d45]">
                  <th className="text-left px-4 py-2 text-gray-400 font-semibold">Indicateur</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-semibold">Ratio</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-semibold">CFA/kg</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-semibold">Montant total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Coût de revient (D1+D2+D3)", ratio: s.taux_cout, u: s.cout_u, t: s.cout_t, highlight: false },
                  { label: "Chiffre d'affaires D4",       ratio: 1,           u: s.d4_u,   t: s.d4_t,   highlight: false },
                  { label: "Marge brute (D4 – D1)",       ratio: s.taux_mb,   u: s.mb_u,   t: s.mb_t,   highlight: false },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-50 dark:border-[#1e2d45] bg-white dark:bg-[#131d2e]">
                    <td className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300">{row.label}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 font-mono">{P(row.ratio)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">{N(row.u)}</td>
                    <td className="px-4 py-2.5 text-right font-bold font-mono text-gray-900 dark:text-gray-100">{N(row.t)} CFA</td>
                  </tr>
                ))}
                <tr className={s.res_t >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 border-t-2 border-emerald-500" : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-t-2 border-red-500"}>
                  <td className="px-4 py-3 font-bold text-sm">Résultat d'exploitation (D4 – D1 – D2 – D3)</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{P(s.taux_res)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{N(s.res_u)}</td>
                  <td className="px-4 py-3 text-right font-bold text-base font-mono">{N(s.res_t)} CFA</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PARTIE 2 */}
          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-[#1e2d45]">
            <div className="bg-[#1A2E1C] text-white px-4 py-2 text-center">
              <span className="text-xs font-bold tracking-widest uppercase">Partie 2 — Distribution du résultat ({N(s.res_t)} CFA)</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-2 font-semibold">Nomenclature</th>
                  <th className="text-center px-3 py-2 font-semibold">Code</th>
                  <th className="text-right px-3 py-2 font-semibold">Taux</th>
                  <th className="text-right px-3 py-2 font-semibold">CFA/kg</th>
                  <th className="text-right px-4 py-2 font-semibold">Montant total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { nom: "TAXES",                  code: "TX", taux: fiche.taux_taxes,                    u: s.tax_u,  t: s.tax_t  },
                  { nom: "COMMISSIONS PRODUCTEUR", code: "CP", taux: fiche.taux_commission_producteur,    u: s.cp_u,   t: s.cp_t   },
                  { nom: "COMMISSIONS ETAAM",      code: "CE", taux: fiche.taux_commission_etaam,         u: s.ce_u,   t: s.ce_t   },
                  { nom: "COMMISSIONS COOPÉRATIVE",code: "CC", taux: fiche.taux_commission_cooperative ?? 0.10, u: s.coop_u, t: s.coop_t },
                ].map((row, i) => (
                  <tr key={row.code} className={`border-b border-gray-50 dark:border-[#1e2d45] ${i % 2 === 0 ? "bg-white dark:bg-[#131d2e]" : "bg-blue-50/40 dark:bg-blue-900/10"}`}>
                    <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">{row.nom}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500 font-mono">{row.code}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">{P(row.taux)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">{N(row.u)}</td>
                    <td className="px-4 py-2.5 text-right font-bold font-mono text-gray-900 dark:text-gray-100">{N(row.t)} CFA</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-800 text-white font-bold">
                  <td className="px-4 py-2.5 text-xs">TOTAL DISTRIBUÉ</td>
                  <td />
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${Math.abs(commission4Total - 1) < 0.001 ? "text-green-300" : "text-yellow-300"}`}>
                    {P(commission4Total)} {Math.abs(commission4Total - 1) >= 0.001 && "⚠"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{N(s.tax_u + s.cp_u + s.ce_u + s.coop_u)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{N(s.tax_t + s.cp_t + s.ce_t + s.coop_t)} CFA</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {fiche.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">Notes / Observations</p>
              <p className="text-sm text-amber-900 dark:text-amber-300">{fiche.notes}</p>
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex justify-between items-center pt-2 pb-1">
            <p className="text-[10px] text-gray-400">
              Créée le {format(new Date(fiche.created_at), "dd/MM/yyyy")} — Mise à jour le {format(new Date(fiche.updated_at), "dd/MM/yyyy")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onExport(fiche)}>
                <Download size={13} className="mr-1" /> Exporter PDF
              </Button>
              <Button size="sm" className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90" onClick={() => { onClose(); onEdit(fiche); }}>
                <Pencil size={13} className="mr-1" /> Modifier la fiche
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const FichesAnalytiques = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [view, setView] = useState<"list" | "editor">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewFiche, setPreviewFiche] = useState<Fiche | null>(null);
  const [form, setForm] = useState<Omit<Fiche, "id"|"created_at"|"updated_at">>(newFiche());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [expandedSections, setExpandedSections] = useState({ d1: true, d2: true, d3: true });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ["fiches-analytiques"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fiches_analytiques")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Fiche[];
    },
  });

  // ── Live calculations ────────────────────────────────────────────────────────
  const summary = calcSummary(form);

  // ── Field helpers ────────────────────────────────────────────────────────────
  const setField = (field: string, val: any) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const updateCharge = useCallback(
    (section: "charges_variables" | "charges_fixes" | "couts_commercialisation") =>
      (idx: number, field: keyof ChargeItem, val: any) => {
        setForm((prev) => {
          const arr = [...(prev[section] as ChargeItem[])];
          arr[idx] = { ...arr[idx], [field]: val };
          return { ...prev, [section]: arr };
        });
      },
    [],
  );

  const addCharge = (section: "charges_variables" | "charges_fixes" | "couts_commercialisation", prefix: string) => {
    setForm((prev) => {
      const arr = [...(prev[section] as ChargeItem[])];
      const idx = arr.length + 1;
      arr.push({ code: `${prefix} ${idx}`, nom: "Nouveau poste", pct_defaut: 0, montant_unitaire: 0 });
      return { ...prev, [section]: arr };
    });
  };

  const removeCharge = (section: "charges_variables" | "charges_fixes" | "couts_commercialisation") =>
    (idx: number) => {
      setForm((prev) => {
        const arr = [...(prev[section] as ChargeItem[])];
        arr.splice(idx, 1);
        return { ...prev, [section]: arr };
      });
    };

  // When prix_unitaire changes, reset montant_unitaire to 0 so defaults recalculate
  const handlePrixChange = (val: number) => {
    setForm((prev) => ({
      ...prev,
      prix_unitaire: val,
      charges_variables: (prev.charges_variables as ChargeItem[]).map((c) => ({ ...c, montant_unitaire: 0 })),
      charges_fixes: (prev.charges_fixes as ChargeItem[]).map((c) => ({ ...c, montant_unitaire: 0 })),
      couts_commercialisation: (prev.couts_commercialisation as ChargeItem[]).map((c) => ({ ...c, montant_unitaire: 0 })),
    }));
  };

  // ── Open editor ──────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm(newFiche());
    setView("editor");
  };

  const openEdit = (fiche: Fiche) => {
    setEditingId(fiche.id);
    setForm({
      produit: fiche.produit,
      code_produit: fiche.code_produit || "",
      campagne: fiche.campagne,
      date_fiche: fiche.date_fiche || new Date().toISOString().slice(0, 10),
      variete: fiche.variete || "",
      superficie: fiche.superficie,
      zone: fiche.zone || "",
      prix_unitaire: fiche.prix_unitaire,
      id_producteur_externe: fiche.id_producteur_externe || "",
      quantite_totale: fiche.quantite_totale,
      contacts: fiche.contacts || "",
      producteur_id: fiche.producteur_id,
      producteurs_noms: fiche.producteurs_noms || [],
      charges_variables: fiche.charges_variables,
      charges_fixes: fiche.charges_fixes,
      couts_commercialisation: fiche.couts_commercialisation,
      taux_taxes: fiche.taux_taxes,
      taux_commission_producteur: fiche.taux_commission_producteur,
      taux_commission_etaam: fiche.taux_commission_etaam,
      taux_commission_cooperative: fiche.taux_commission_cooperative ?? 0.10,
      statut: fiche.statut,
      notes: fiche.notes || "",
    });
    setView("editor");
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async (newStatut?: string) => {
    if (!form.produit || !form.campagne) {
      toast.error("Produit et campagne sont obligatoires");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        statut: newStatut || form.statut,
        charges_variables: summary.d1_items,
        charges_fixes: summary.d2_items,
        couts_commercialisation: summary.d3_items,
        created_by: user?.id,
      };
      if (editingId) {
        const { error } = await (supabase as any)
          .from("fiches_analytiques").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("fiches_analytiques").insert(payload);
        if (error) throw error;
      }
      toast.success(editingId ? "Fiche mise à jour" : "Fiche créée");
      queryClient.invalidateQueries({ queryKey: ["fiches-analytiques"] });
      if (newStatut) setField("statut", newStatut);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, produit: string) => {
    confirm({
      title: "Supprimer la fiche",
      description: `Voulez-vous supprimer la fiche "${produit}" ? Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      variant: "danger",
      onConfirm: async () => {
        await (supabase as any).from("fiches_analytiques").delete().eq("id", id);
        queryClient.invalidateQueries({ queryKey: ["fiches-analytiques"] });
        toast.success("Fiche supprimée");
        if (editingId === id) setView("list");
      },
    });
  };

  const filtered = fiches.filter((f) => {
    const matchSearch =
      f.produit.toLowerCase().includes(search.toLowerCase()) ||
      f.campagne.includes(search) ||
      (f.zone || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "tous" || f.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const toggleSection = (s: "d1" | "d2" | "d3") =>
    setExpandedSections((prev) => ({ ...prev, [s]: !prev[s] }));

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <DashboardLayout
        title="Fiches Analytiques"
        subtitle="Fiche analytique des éléments de dépenses et recettes agricoles"
        actions={
          <Button onClick={openNew} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
            <Plus size={15} className="mr-1.5" /> Nouvelle fiche
          </Button>
        }
      >
        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total fiches", value: fiches.length, color: "text-gray-700" },
            { label: "Brouillons",   value: fiches.filter((f) => f.statut === "brouillon").length, color: "text-amber-600" },
            { label: "Validées",     value: fiches.filter((f) => f.statut === "validé").length,   color: "text-emerald-600" },
            { label: "Archivées",    value: fiches.filter((f) => f.statut === "archivé").length,  color: "text-gray-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] p-4 shadow-sm">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters & Search - Quantum Standard */}
        <div className="bg-white dark:bg-[#131d2e] rounded-2xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-2 flex flex-col sm:flex-row gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <Input
              placeholder="Rechercher par produit, campagne, zone…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-12 border-none bg-transparent focus-visible:ring-0 font-medium h-11"
            />
          </div>
          <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-xl overflow-x-auto">
            {[
              { id: "tous", label: "Tous" },
              { id: "brouillon", label: "Brouillons" },
              { id: "validé", label: "Validées" },
              { id: "archivé", label: "Archivées" }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => handleStatusFilterChange(s.id)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  statusFilter === s.id
                    ? "bg-[#1A2E1C] text-white shadow-md shadow-emerald-900/10"
                    : "text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-white/5"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* List container */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">

          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune fiche analytique</p>
              <p className="text-sm mt-1">Cliquez sur « Nouvelle fiche » pour commencer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-[#1e2d45]">
                  <tr>
                    {["Produit / Variété", "Date", "Campagne", "Zone", "Prix unit.", "Quantité", "Résultat exploit.", "Statut", ""].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#1e2d45]">
                  {currentItems.map((fiche) => {
                    const s = calcSummary(fiche);
                    return (
                      <tr key={fiche.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer" onClick={() => setPreviewFiche(fiche)}>
                        <td className="px-4 py-3 pl-5">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{fiche.produit}</p>
                          {fiche.variete && <p className="text-xs text-gray-400 mt-0.5">{fiche.variete}</p>}
                          {fiche.producteurs_noms?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {fiche.producteurs_noms.slice(0, 2).map((n, i) => (
                                <span key={i} className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">{n}</span>
                              ))}
                              {fiche.producteurs_noms.length > 2 && (
                                <span className="text-[10px] text-gray-400">+{fiche.producteurs_noms.length - 2}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {fiche.date_fiche ? format(new Date(fiche.date_fiche), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{fiche.campagne}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fiche.zone || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{N(fiche.prix_unitaire)} CFA</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{N(fiche.quantite_totale)} kg</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${s.res_t >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {N(s.res_t)} CFA
                          </span>
                        </td>
                        <td className="px-4 py-3">{statutBadge(fiche.statut)}</td>
                        <td className="px-4 py-3 pr-5">
                          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="icon" className="h-7 w-7" title="Aperçu"
                              onClick={() => setPreviewFiche(fiche)}>
                              <Eye size={13} />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" title="Modifier"
                              onClick={() => openEdit(fiche)}>
                              <Pencil size={13} />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" title="Export PDF"
                              onClick={() => exportPDF(fiche, calcSummary(fiche))}>
                              <Download size={13} />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" title="Supprimer"
                              onClick={() => handleDelete(fiche.id, fiche.produit)}>
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#131d2e] p-4 rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm mt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
              Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} fiches
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 h-9 w-9"
              >
                <ChevronLeft size={14} />
              </Button>
              
              <div className="flex items-center gap-1.5 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      "h-9 w-9 rounded-xl text-[10px] font-black transition-all duration-300",
                      currentPage === p
                        ? "bg-[#1A2E1C] text-white shadow-lg shadow-emerald-900/10"
                        : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 h-9 w-9"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        <FichePreviewModal
          fiche={previewFiche}
          onClose={() => setPreviewFiche(null)}
          onEdit={(f) => openEdit(f)}
          onExport={(f) => exportPDF(f, calcSummary(f))}
        />
      </DashboardLayout>
    );
  }

  // ── EDITOR VIEW ──────────────────────────────────────────────────────────────
  const s = summary;
  const cap_ok_d1 = form.prix_unitaire === 0 || s.d1_u <= s.cap_d1;
  const cap_ok_d2 = form.prix_unitaire === 0 || s.d2_u <= s.cap_d2;
  const cap_ok_d3 = form.prix_unitaire === 0 || s.d3_u <= s.cap_d3;

  return (
    <DashboardLayout
      title={editingId ? `Fiche — ${form.produit || "…"}` : "Nouvelle Fiche Analytique"}
      subtitle="Calculs automatiques en temps réel"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("list")}>
            <ArrowLeft size={14} className="mr-1" /> Retour
          </Button>
          {editingId && (
            <Button variant="outline" size="sm" onClick={() => exportPDF(form as Fiche, s)}>
              <Download size={14} className="mr-1" /> PDF
            </Button>
          )}
          {form.statut !== "validé" && (
            <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={() => handleSave("validé")} disabled={saving}>
              <CheckCircle2 size={14} className="mr-1" /> Valider
            </Button>
          )}
          {form.statut === "validé" && (
            <Button variant="outline" size="sm" className="text-gray-500"
              onClick={() => handleSave("archivé")} disabled={saving}>
              <Archive size={14} className="mr-1" /> Archiver
            </Button>
          )}
          <Button onClick={() => handleSave()} disabled={saving} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90">
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-5 max-w-6xl">

        {/* ── En-tête produit ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
          <div className="bg-[#1A2E1C] text-white px-5 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">ETAAM — Coopérative Régionale des Planteurs et Agriculteurs de Ziguinchor</p>
            <p className="font-bold text-sm mt-0.5">FICHE ANALYTIQUE DES ÉLÉMENTS DE DÉPENSES ET RECETTES</p>
          </div>
          <div className="p-5 space-y-4">
            {/* Row 1 — identité produit */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Produit *",   field: "produit",      type: "text",   placeholder: "Mangue" },
                { label: "Code produit",field: "code_produit", type: "text",   placeholder: "Mgu" },
                { label: "Campagne *",  field: "campagne",     type: "text",   placeholder: "2026" },
                { label: "Variété",     field: "variete",      type: "text",   placeholder: "Kent" },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
                  <Input type={type} placeholder={placeholder} value={(form as any)[field] || ""}
                    onChange={(e) => setField(field, e.target.value)} className="h-9 text-sm" />
                </div>
              ))}
            </div>

            {/* Row 2 — lieu + date + prix */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone</Label>
                <Input placeholder="Baraf" value={form.zone} onChange={(e) => setField("zone", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Superficie (ha)</Label>
                <Input type="number" placeholder="20" value={form.superficie || ""} onChange={(e) => setField("superficie", Number(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date de la fiche *</Label>
                <Input type="date" value={form.date_fiche} onChange={(e) => setField("date_fiche", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Producteur</Label>
                <Input placeholder="54123" value={form.id_producteur_externe} onChange={(e) => setField("id_producteur_externe", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            {/* Row 3 — prix + qte + contacts */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix unitaire (CFA/kg) *</Label>
                <Input type="number" placeholder="500" value={form.prix_unitaire || ""}
                  onChange={(e) => handlePrixChange(Number(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantité totale (kg) *</Label>
                <Input type="number" placeholder="5000" value={form.quantite_totale || ""}
                  onChange={(e) => setField("quantite_totale", Number(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</Label>
                <Input placeholder="77 482 82 59" value={form.contacts} onChange={(e) => setField("contacts", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            {/* Row 4 — producteurs (tag input, optional, multi) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Producteurs
                </Label>
                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                  Optionnel — vente groupée possible
                </span>
                {form.producteurs_noms.length > 1 && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    {form.producteurs_noms.length} producteurs
                  </span>
                )}
              </div>
              <ProducerTagInput
                value={form.producteurs_noms}
                onChange={(v) => setField("producteurs_noms", v)}
              />
              <p className="text-[10px] text-gray-400">Tapez un nom et appuyez sur <kbd className="bg-gray-100 dark:bg-white/10 px-1 rounded text-[10px]">Entrée</kbd> pour ajouter. Plusieurs producteurs pour une vente groupée.</p>
            </div>
          </div>
        </div>

        {/* ── Partie I ─────────────────────────────────────────────────────── */}
        <div className="bg-[#1A2E1C] text-white rounded-xl py-2 text-center">
          <p className="font-bold tracking-widest text-sm">PARTIE I</p>
        </div>

        {/* D1 — Charges variables */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            onClick={() => toggleSection("d1")}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">Charges Variables (D1)</span>
              <span className="text-xs text-gray-400">Max 20% du prix unitaire</span>
              {!cap_ok_d1 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><AlertTriangle size={10}/>Dépassement</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{N(s.d1_t)} CFA</span>
              {expandedSections.d1 ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </button>
          {expandedSections.d1 && (
            <div className="p-4 pt-0">
              <SH label="Charges variables" sub="20% prix unitaire" cap={s.cap_d1} total={s.d1_u} px={form.prix_unitaire} />
              <ChargeTable
                items={form.charges_variables as ChargeItem[]}
                px={form.prix_unitaire} qt={form.quantite_totale}
                onUpdate={updateCharge("charges_variables")}
                onAdd={() => addCharge("charges_variables", "CHV")}
                onRemove={removeCharge("charges_variables")}
                cap={s.cap_d1} totalLabel="D1"
              />
            </div>
          )}
        </div>

        {/* D2 — Charges fixes */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            onClick={() => toggleSection("d2")}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">Charges Fixes (D2)</span>
              <span className="text-xs text-gray-400">Max 20% du prix unitaire</span>
              {!cap_ok_d2 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><AlertTriangle size={10}/>Dépassement</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{N(s.d2_t)} CFA</span>
              {expandedSections.d2 ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </button>
          {expandedSections.d2 && (
            <div className="p-4 pt-0">
              <SH label="Charges fixes" sub="20% prix unitaire" cap={s.cap_d2} total={s.d2_u} px={form.prix_unitaire} />
              <ChargeTable
                items={form.charges_fixes as ChargeItem[]}
                px={form.prix_unitaire} qt={form.quantite_totale}
                onUpdate={updateCharge("charges_fixes")}
                onAdd={() => addCharge("charges_fixes", "CHF")}
                onRemove={removeCharge("charges_fixes")}
                cap={s.cap_d2} totalLabel="D2"
              />
            </div>
          )}
        </div>

        {/* D3 — Coûts de commercialisation */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            onClick={() => toggleSection("d3")}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">Coûts de Commercialisation (D3)</span>
              <span className="text-xs text-gray-400">Max 10% du prix unitaire</span>
              {!cap_ok_d3 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><AlertTriangle size={10}/>Dépassement</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{N(s.d3_t)} CFA</span>
              {expandedSections.d3 ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </button>
          {expandedSections.d3 && (
            <div className="p-4 pt-0">
              <SH label="Coûts de commercialisation" sub="10% prix unitaire" cap={s.cap_d3} total={s.d3_u} px={form.prix_unitaire} />
              <ChargeTable
                items={form.couts_commercialisation as ChargeItem[]}
                px={form.prix_unitaire} qt={form.quantite_totale}
                onUpdate={updateCharge("couts_commercialisation")}
                onAdd={() => addCharge("couts_commercialisation", "CM")}
                onRemove={removeCharge("couts_commercialisation")}
                cap={s.cap_d3} totalLabel="D3"
              />
            </div>
          )}
        </div>

        {/* ── Synthèse (Summary) ───────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-[#1e2d45] bg-gray-50 dark:bg-white/[0.02]">
            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Synthèse</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#1e2d45] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-2.5">Indicateur</th>
                  <th className="text-right px-4 py-2.5">Ratio</th>
                  <th className="text-right px-4 py-2.5">CFA / kg</th>
                  <th className="text-right px-5 py-2.5">Montant total (CFA)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Coût de revient total (D1+D2+D3)", ratio: s.taux_cout, u: s.cout_u, t: s.cout_t, color: "" },
                  { label: "Chiffre d'affaires D4",            ratio: 1,           u: s.d4_u,   t: s.d4_t,   color: "" },
                  { label: "Marge brute = D4 – D1",            ratio: s.taux_mb,   u: s.mb_u,   t: s.mb_t,   color: "" },
                  { label: "Résultat d'exploitation = D4 – (D1+D2+D3)", ratio: s.taux_res, u: s.res_u, t: s.res_t, color: "result" },
                ].map((row) => (
                  <tr key={row.label} className={`border-b border-gray-50 dark:border-[#1e2d45] ${
                    row.color === "result"
                      ? s.res_t >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"
                      : ""
                  }`}>
                    <td className={`px-5 py-3 font-semibold ${row.color === "result" ? (s.res_t >= 0 ? "text-emerald-700" : "text-red-600") : "text-gray-800 dark:text-gray-200"}`}>
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 font-mono">{P(row.ratio)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 font-mono">{N(row.u)}</td>
                    <td className={`px-5 py-3 text-right font-bold text-base font-mono ${
                      row.color === "result"
                        ? s.res_t >= 0 ? "text-emerald-600" : "text-red-500"
                        : "text-gray-900 dark:text-gray-100"
                    }`}>
                      {N(row.t)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Partie 2 — Taxes/Commissions ─────────────────────────────────── */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm overflow-hidden">
          <div className="bg-[#1A2E1C] text-white px-5 py-2 text-center">
            <p className="font-bold tracking-widest text-sm">PARTIE 2 — TAXES / COMMISSIONS</p>
            <p className="text-xs opacity-60 mt-0.5">Distribution du résultat d'exploitation ({N(s.res_t)} CFA)</p>
          </div>

          {/* Rate controls */}
          <div className="p-4 border-b border-gray-100 dark:border-[#1e2d45] bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Taux Taxes",             field: "taux_taxes" },
                { label: "Commission Producteur",   field: "taux_commission_producteur" },
                { label: "Commission ETAAM",        field: "taux_commission_etaam" },
                { label: "Commission Coopérative",  field: "taux_commission_cooperative" },
              ].map(({ label, field }) => {
                const total = Number(form.taux_taxes) + Number(form.taux_commission_producteur) + Number(form.taux_commission_etaam) + Number(form.taux_commission_cooperative);
                const ok = Math.abs(total - 1) < 0.001;
                const isLast = field === "taux_commission_cooperative";
                return (
                  <div key={field} className="space-y-1 min-w-[160px]">
                    <Label className="text-xs font-semibold text-gray-500">{label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.01" min="0" max="1"
                        value={(form as any)[field]}
                        onChange={(e) => setField(field, Number(e.target.value))}
                        className="h-8 text-sm w-24"
                      />
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        = {P(Number((form as any)[field]))}
                      </span>
                    </div>
                    {isLast && !ok && (
                      <p className="text-[11px] text-red-500">Total = {P(total)} ≠ 100%</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribution table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <th className="text-left px-5 py-2.5">Nomenclature poste</th>
                  <th className="text-center px-4 py-2.5">Code</th>
                  <th className="text-right px-4 py-2.5">Pourcentage</th>
                  <th className="text-right px-4 py-2.5">CFA / kg</th>
                  <th className="text-right px-5 py-2.5">Montant total (CFA)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { nom: "TAXES (À traiter)",         code: "TX",   taux: form.taux_taxes,                      u: s.tax_u,  t: s.tax_t  },
                  { nom: "COMMISSIONS PRODUCTEUR",    code: "CP",   taux: form.taux_commission_producteur,      u: s.cp_u,   t: s.cp_t   },
                  { nom: "COMMISSIONS ETAAM",         code: "CE",   taux: form.taux_commission_etaam,           u: s.ce_u,   t: s.ce_t   },
                  { nom: "COMMISSIONS COOPÉRATIVE",   code: "CC",   taux: form.taux_commission_cooperative,     u: s.coop_u, t: s.coop_t },
                ].map((row, i) => (
                  <tr key={row.code} className={`border-b border-gray-50 dark:border-[#1e2d45] ${i % 2 === 1 ? "bg-gray-50/50 dark:bg-white/[0.01]" : ""}`}>
                    <td className="px-5 py-3 font-semibold text-gray-800 dark:text-gray-200">{row.nom}</td>
                    <td className="px-4 py-3 text-center text-gray-500 font-mono">{row.code}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">{P(row.taux)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 font-mono">{N(row.u)}</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900 dark:text-gray-100 font-mono">{N(row.t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-[#131d2e] rounded-xl border border-gray-100 dark:border-[#1e2d45] shadow-sm p-5">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Notes / Observations</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Informations complémentaires, remarques…"
            className="min-h-[80px] text-sm"
          />
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between pb-8">
          <Button variant="outline" onClick={() => setView("list")}>
            <ArrowLeft size={14} className="mr-1" /> Retour à la liste
          </Button>
          <div className="flex gap-2">
            {editingId && (
              <>
                <Button variant="outline" onClick={() => exportPDF(form as Fiche, s)}>
                  <Download size={14} className="mr-1" /> Exporter PDF
                </Button>
                <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => handleDelete(editingId, form.produit)}>
                  <Trash2 size={14} className="mr-1" /> Supprimer
                </Button>
              </>
            )}
            <Button onClick={() => handleSave()} disabled={saving} className="bg-[#1A2E1C] text-white hover:bg-[#1A2E1C]/90 px-8">
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
              Enregistrer
            </Button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default FichesAnalytiques;
