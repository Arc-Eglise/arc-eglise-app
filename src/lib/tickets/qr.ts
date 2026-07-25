import QRCode from "qrcode";
import { randomBytes } from "crypto";
import { siteUrl } from "@/lib/url";

// Nom officiel de l'église (imprimé sur le billet).
export const CHURCH_NAME = "ARC — AMBASSADE DU ROYAUME DE CHRIST";
const LOGO_URL = siteUrl("/images/logo-arc.jpeg");
const ARC_NAVY = "#2B3475";
const ARC_GOLD = "#C9A227";

/** Jeton unique encodé dans le QR (URL-safe, ~22 caractères). */
export function newTicketCode(): string {
  return randomBytes(16).toString("base64url");
}

/** URL de vérification encodée dans le QR (ouvre/valide le billet côté serveur). */
export function ticketVerifyUrl(code: string): string {
  return siteUrl(`/t/${code}`);
}

/** QR (PNG data URL) encodant l'URL de vérification du billet. */
export async function ticketQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(ticketVerifyUrl(code), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: { dark: "#1a1d3a", light: "#ffffff" },
  });
}

export interface TicketCardInfo {
  eventName: string;
  eventDate: string;   // déjà formaté (ex: « dimanche 18 août 2026 · 10h30 »)
  location: string;
  holderName: string;
  qrDataUrl: string;
}

/**
 * Carte visuelle du billet (HTML email-safe, table-based).
 * Layout demandé :
 *   AU-DESSUS : logo + nom de l'église + nom de l'événement
 *   CENTRE    : QR code
 *   EN-DESSOUS: nom du participant + date d'utilisation
 */
export function ticketCardHtml(info: TicketCardInfo): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:380px;margin:0 auto;background:#ffffff;border:1px solid #e6e8f2;border-radius:16px;overflow:hidden;">
  <!-- Au-dessus : logo + église + événement -->
  <tr>
    <td style="background:${ARC_NAVY};padding:18px 20px;text-align:center;">
      <img src="${LOGO_URL}" alt="ARC Église" width="72" height="44" style="display:block;margin:0 auto 8px;border:0;" />
      <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:12px;letter-spacing:.5px;font-weight:700;">${CHURCH_NAME}</div>
      <div style="color:${ARC_GOLD};font-size:15px;font-weight:700;margin-top:6px;">${escapeHtml(info.eventName)}</div>
    </td>
  </tr>
  <!-- Centre : QR -->
  <tr>
    <td style="padding:22px 20px 10px;text-align:center;">
      <img src="${info.qrDataUrl}" alt="Billet QR" width="220" height="220" style="display:block;margin:0 auto;border:0;" />
      <div style="font-size:11px;color:#8890aa;margin-top:8px;">Présente ce QR à l'entrée</div>
    </td>
  </tr>
  <!-- En-dessous : participant + date d'utilisation -->
  <tr>
    <td style="padding:6px 20px 20px;text-align:center;">
      <div style="font-size:16px;font-weight:700;color:#1a1d3a;">${escapeHtml(info.holderName)}</div>
      <div style="font-size:13px;color:${ARC_NAVY};margin-top:4px;">📅 ${escapeHtml(info.eventDate)}</div>
      <div style="font-size:12px;color:#8890aa;margin-top:2px;">📍 ${escapeHtml(info.location)}</div>
    </td>
  </tr>
</table>`.trim();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
