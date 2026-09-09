const PDFDocument = require("pdfkit");
const { createClient } = require("@supabase/supabase-js");

const BRAND_BLUE = "#1a5ac0";
const TEXT_DARK = "#1c1b1b";
const TEXT_MUTED = "#5b5f61";
const LINE_COLOR = "#e5e2e1";

const TYPOLOGIE_LABELS = {
  residentiel: "Résidentiel",
  commercial: "Commercial",
  industriel: "Industriel",
};

module.exports = async (req, res) => {
  const id = req.query.id;
  if (!id) {
    res.status(400).json({ error: "Paramètre 'id' manquant." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ error: "Configuration serveur incomplète (Supabase)." });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: devis, error } = await supabase
    .from("devis_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !devis) {
    res.status(404).json({ error: "Demande de devis introuvable." });
    return;
  }

  const { data: categories } = await supabase.from("categories").select("*");
  const categoryMap = Object.fromEntries((categories || []).map((c) => [c.id, c]));

  // Fetch the logo from the deployed site itself so there's one source of
  // truth for the image (assets/images/logo/keniar-logo.png).
  let logoBuffer = null;
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const logoUrl = `${protocol}://${req.headers.host}/assets/images/logo/keniar-logo.png`;
    const logoRes = await fetch(logoUrl);
    if (logoRes.ok) {
      logoBuffer = Buffer.from(await logoRes.arrayBuffer());
    }
  } catch (err) {
    console.error("Could not fetch logo for PDF:", err);
  }

  const shortId = devis.id.split("-")[0].toUpperCase();
  const dateStr = new Date(devis.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="devis-keniar-wide-${shortId}.pdf"`);
  doc.pipe(res);

  // ---------------- Header ----------------
  if (logoBuffer) {
    doc.image(logoBuffer, 50, 45, { width: 50, height: 50 });
  }
  doc
    .fillColor(TEXT_DARK)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("EURL KENIAR WIDE", 112, 50);
  doc
    .fillColor(TEXT_MUTED)
    .font("Helvetica")
    .fontSize(9)
    .text("Sécurité Électronique & Infrastructures Courants Faibles", 112, 70);

  doc
    .fillColor(BRAND_BLUE)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(`DEVIS N° ${shortId}`, 0, 48, { align: "right" });
  doc
    .fillColor(TEXT_MUTED)
    .font("Helvetica")
    .fontSize(9)
    .text(`Émis le ${dateStr}`, 0, 70, { align: "right" });

  doc.moveTo(50, 110).lineTo(545, 110).strokeColor(LINE_COLOR).lineWidth(1).stroke();

  // ---------------- Client info ----------------
  let y = 128;
  doc.fillColor(TEXT_MUTED).font("Helvetica-Bold").fontSize(9).text("CLIENT", 50, y);
  y += 16;
  doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(10);
  doc.text(`Nom / Entreprise : ${devis.nom || "—"}`, 50, y);
  y += 15;
  doc.text(`Téléphone : ${devis.telephone || "—"}`, 50, y);
  y += 15;
  if (devis.adresse) {
    doc.text(`Adresse du site : ${devis.adresse}`, 50, y);
    y += 15;
  }
  doc.text(`Typologie : ${TYPOLOGIE_LABELS[devis.typologie] || "—"}`, 50, y);
  y += 25;

  const items = Array.isArray(devis.items) ? devis.items : [];

  if (items.length > 0) {
    // ---------------- Itemized table ----------------
    y = drawTableHeader(doc, y);
    let total = 0;

    items.forEach((item, i) => {
      if (y > 720) {
        doc.addPage();
        y = 50;
        y = drawTableHeader(doc, y);
      }
      const lineTotal = Number(item.price) * Number(item.qty || 1);
      total += lineTotal;

      if (i % 2 === 0) {
        doc.rect(50, y - 4, 495, 22).fill("#f6f3f2");
      }
      doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(9.5);
      doc.text(item.name || "—", 55, y, { width: 250 });
      doc.text(String(item.qty || 1), 315, y, { width: 50, align: "center" });
      doc.text(formatPrice(item.price), 370, y, { width: 85, align: "right" });
      doc.text(formatPrice(lineTotal), 455, y, { width: 85, align: "right" });
      y += 22;
    });

    y += 10;
    doc.moveTo(320, y).lineTo(545, y).strokeColor(LINE_COLOR).stroke();
    y += 10;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT_DARK);
    doc.text("Total estimé", 320, y, { width: 135 });
    doc.fillColor(BRAND_BLUE).text(formatPrice(total), 455, y, { width: 85, align: "right" });
    y += 30;

    doc
      .font("Helvetica-Oblique")
      .fontSize(8.5)
      .fillColor(TEXT_MUTED)
      .text(
        "Ce montant est une estimation hors installation, transport et taxes éventuelles. Le devis final vous sera confirmé après visite technique si nécessaire.",
        50, y, { width: 495 }
      );
    y += 35;
  } else {
    // ---------------- Configurator recap (no priced items yet) ----------------
    doc.fillColor(TEXT_MUTED).font("Helvetica-Bold").fontSize(9).text("DÉTAILS DE LA DEMANDE", 50, y);
    y += 16;
    doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(10);
    if (devis.surface) {
      doc.text(`Surface estimée : ${devis.surface} m²`, 50, y);
      y += 15;
    }
    if (devis.acces) {
      doc.text(`Pièces / accès : ${devis.acces}`, 50, y);
      y += 15;
    }
    const equipLabels = (devis.equipements || [])
      .map((cid) => (categoryMap[cid] ? categoryMap[cid].label : cid))
      .join(", ");
    doc.text(`Équipements souhaités : ${equipLabels || "—"}`, 50, y, { width: 495 });
    y += 30;

    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor(TEXT_MUTED)
      .text(
        "Ce document confirme la réception de votre demande. Un technicien EURL Keniar Wide vous contactera avec un chiffrage détaillé après étude de vos besoins.",
        50, y, { width: 495 }
      );
    y += 40;
  }

  // ---------------- Footer ----------------
  const footerY = 760;
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(LINE_COLOR).stroke();
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(TEXT_MUTED)
    .text("EURL Keniar Wide — Sécurité Électronique & Courants Faibles — Algérie", 50, footerY + 8, {
      width: 495,
      align: "center",
    });
  doc.text("Ce devis est valable 30 jours à compter de sa date d'émission.", 50, footerY + 20, {
    width: 495,
    align: "center",
  });

  doc.end();
};

function drawTableHeader(doc, y) {
  doc.rect(50, y - 6, 495, 22).fill(BRAND_BLUE);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  doc.text("Produit", 55, y, { width: 250 });
  doc.text("Qté", 315, y, { width: 50, align: "center" });
  doc.text("Prix unit.", 370, y, { width: 85, align: "right" });
  doc.text("Total", 455, y, { width: 85, align: "right" });
  return y + 26;
}

function formatPrice(value) {
  const num = Math.round(Number(value || 0));
  // Manual thousands separator (regular space) — avoids the narrow
  // no-break space that Number.toLocaleString('fr-FR') produces, which
  // PDFKit's standard Helvetica font can't render correctly.
  const withSpaces = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withSpaces} DZD`;
}
