import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export async function certificatePdf(c: { code: string; name: string; course: string; instructor: string; issued: string; hours: number; score: number; verifyUrl: string }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape
  const { width: W, height: H } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifIt = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.043, 0.106, 0.247), blue = rgb(0.114, 0.306, 0.847), gold = rgb(0.96, 0.62, 0.04), grey = rgb(0.4, 0.45, 0.55);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: navy, borderWidth: 3 });
  page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: gold, borderWidth: 1 });
  page.drawRectangle({ x: 18, y: H - 90, width: W - 36, height: 72, color: navy });
  page.drawText("POWER SECTOR ACADEMY", { x: 60, y: H - 62, size: 22, font: sansB, color: rgb(1, 1, 1) });
  page.drawText("Making you ready for AI-enabled Power Sector", { x: 60, y: H - 80, size: 10, font: sans, color: rgb(0.8, 0.85, 1) });

  const center = (t: string, y: number, size: number, font = serif, color = navy) =>
    page.drawText(t, { x: (W - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });

  center("CERTIFICATE OF COMPLETION", H - 150, 26, serif, navy);
  center("This is to certify that", H - 190, 14, serifIt, grey);
  center(c.name, H - 240, 38, serif, blue);
  page.drawLine({ start: { x: W / 2 - 200, y: H - 252 }, end: { x: W / 2 + 200, y: H - 252 }, color: gold, thickness: 1.5 });
  center("has successfully completed the course", H - 285, 14, serifIt, grey);
  let size = 24;
  while (serif.widthOfTextAtSize(c.course, size) > W - 160) size--;
  center(c.course, H - 325, size, serif, navy);
  center(`Learning time ${c.hours} hours  ·  Assessment score ${c.score}%  ·  Issued ${c.issued}`, H - 360, 11, sans, grey);

  page.drawLine({ start: { x: 90, y: 110 }, end: { x: 290, y: 110 }, color: navy, thickness: 1 });
  page.drawText(c.instructor, { x: 90, y: 92, size: 12, font: sansB, color: navy });
  page.drawText("Course Instructor", { x: 90, y: 78, size: 10, font: sans, color: grey });

  const qr = await QRCode.toBuffer(c.verifyUrl, { margin: 1, width: 240, color: { dark: "#0b1b3f", light: "#ffffff" } });
  const img = await pdf.embedPng(qr);
  page.drawImage(img, { x: W - 180, y: 60, width: 100, height: 100 });
  page.drawText(`Certificate ID: ${c.code}`, { x: W - 400, y: 92, size: 10, font: sansB, color: navy });
  page.drawText("Scan or visit to verify:", { x: W - 400, y: 78, size: 9, font: sans, color: grey });
  page.drawText(c.verifyUrl.replace(/^https?:\/\//, "").slice(0, 40), { x: W - 400, y: 66, size: 8, font: sans, color: blue });

  // gold seal
  page.drawCircle({ x: W / 2, y: 110, size: 38, color: gold });
  page.drawCircle({ x: W / 2, y: 110, size: 32, borderColor: rgb(1, 1, 1), borderWidth: 1.5 });
  const seal = "VERIFIED";
  page.drawText(seal, { x: W / 2 - sansB.widthOfTextAtSize(seal, 10) / 2, y: 106, size: 10, font: sansB, color: rgb(1, 1, 1) });
  return pdf.save();
}
