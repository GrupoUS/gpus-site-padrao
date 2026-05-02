/**
 * WhatsApp SDR (Laura) — número único para CTAs e atendimento via site.
 * E.164 sem + (padrão wa.me).
 */
export const WHATSAPP_SDR_E164 = "556294705081";

/** True when `url` already opens WhatsApp (evita CTA primário + botão verde redundantes). */
export function isWhatsAppDestination(url: string): boolean {
	const u = url.trim().toLowerCase();
	return (
		u.includes("wa.me/") ||
		u.includes("api.whatsapp.com") ||
		u.includes("wa.link/")
	);
}

export function whatsappUrlWithText(message: string): string {
	return `https://wa.me/${WHATSAPP_SDR_E164}?text=${encodeURIComponent(message)}`;
}

export const whatsappUrlBase = `https://wa.me/${WHATSAPP_SDR_E164}`;

/** Contato institucional / home — mensagem pré-preenchida para a Laura */
export const WHATSAPP_DEFAULT_SITE_MESSAGE =
	"Olá, Laura! Gostaria de falar sobre os programas do Grupo US e qual faz sentido para o meu momento.";
