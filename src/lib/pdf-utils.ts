import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface InvoiceLine {
  description: string;
  quantite: number;
  prix_unitaire: number;
}

interface InvoiceData {
  numero_facture: string;
  date_facture: string;
  date_echeance?: string | null;
  client_nom: string;
  client_contact?: string | null;
  lignes: string | InvoiceLine[]; // JSON string or array
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  type: string;
  notes?: string | null;
}

interface CompanyInfo {
  name: string;
  subtitle: string;
  address?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
}

export const generateInvoicePDF = async (invoice: InvoiceData, company: CompanyInfo) => {
  const doc = new jsPDF() as any;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Helper for colors
  const colors = {
    primary: [26, 46, 28], // #1A2E1C
    secondary: [128, 128, 128],
    accent: [232, 245, 233],
    text: [31, 41, 55],
  };

  // 1. Header & Logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text(company.name.toUpperCase(), margin, 30);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(company.subtitle, margin, 37);

  // Company Details (Right side)
  doc.setFontSize(9);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  let rightY = 30;
  if (company.address) { doc.text(company.address, pageWidth - margin, rightY, { align: "right" }); rightY += 5; }
  if (company.email) { doc.text(company.email, pageWidth - margin, rightY, { align: "right" }); rightY += 5; }
  if (company.phone) { doc.text(company.phone, pageWidth - margin, rightY, { align: "right" }); rightY += 5; }

  // 2. Invoice Title and Info
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, 50, pageWidth - margin, 50);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(`FACTURE: ${invoice.numero_facture}`, margin, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date d'émission: ${format(new Date(invoice.date_facture), "dd MMMM yyyy", { locale: fr })}`, margin, 73);
  if (invoice.date_echeance) {
    doc.setTextColor(220, 38, 38); // Red for due date
    doc.text(`Échéance: ${format(new Date(invoice.date_echeance), "dd MMMM yyyy", { locale: fr })}`, margin, 78);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  }

  // 3. Client Section
  const clientBoxY = 95;
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, clientBoxY, (pageWidth - margin * 2) / 2, 35, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("FACTURE À:", margin + 5, clientBoxY + 8);
  
  doc.setFontSize(12);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(invoice.client_nom, margin + 5, clientBoxY + 16);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (invoice.client_contact) {
    doc.text(invoice.client_contact, margin + 5, clientBoxY + 23);
  }

  // 4. Details / Type
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("DETAILS / TYPE:", pageWidth / 2 + 10, clientBoxY + 8);
  doc.setFontSize(10);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(invoice.type, pageWidth / 2 + 10, clientBoxY + 16);

  // 5. Lines Table
  let lines: InvoiceLine[] = [];
  try {
    lines = typeof invoice.lignes === "string" ? JSON.parse(invoice.lignes) : invoice.lignes;
  } catch (e) {
    console.error("Error parsing invoice lines", e);
  }

  const tableData = lines.map((l, i) => [
    i + 1,
    l.description,
    l.quantite,
    `${Number(l.prix_unitaire).toLocaleString()} FCFA`,
    `${(l.quantite * l.prix_unitaire).toLocaleString()} FCFA`
  ]);

  doc.autoTable({
    startY: 140,
    head: [["#", "Description", "Qté", "P.U", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { 
      fillColor: colors.primary, 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold"
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    styles: { fontSize: 9, cellPadding: 5 },
    margin: { left: margin, right: margin }
  });

  // 6. Totals
  const finalY = (doc as any).lastAutoTable.cursor.y + 10;
  const totalsX = pageWidth - margin - 80;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Total HT:", totalsX, finalY);
  doc.text(`${Number(invoice.montant_ht).toLocaleString()} FCFA`, pageWidth - margin, finalY, { align: "right" });

  doc.text("TVA (18%):", totalsX, finalY + 7);
  doc.text(`${Number(invoice.tva).toLocaleString()} FCFA`, pageWidth - margin, finalY + 7, { align: "right" });

  doc.setLineWidth(0.8);
  doc.setDrawColor(200);
  doc.line(totalsX, finalY + 11, pageWidth - margin, finalY + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("TOTAL TTC:", totalsX, finalY + 18);
  doc.text(`${Number(invoice.montant_ttc).toLocaleString()} FCFA`, pageWidth - margin, finalY + 18, { align: "right" });

  // 7. Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Cette facture est émise électroniquement par le système de gestion CRPAZ.", pageWidth / 2, pageHeight - 20, { align: "center" });
  doc.text("Merci de votre confiance.", pageWidth / 2, pageHeight - 15, { align: "center" });

  // 8. Download
  doc.save(`Facture_${invoice.numero_facture}.pdf`);
  return true;
};
