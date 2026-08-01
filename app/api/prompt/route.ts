import { portablePrompt } from "@/lib/portable";

/**
 * `GET /api/prompt` — el prompt para pegar en ChatGPT, Claude o Gemini.
 *
 * Texto plano para que se copie de una. Es la versión portable de La LogIA: lo
 * único que necesita es un asistente que ya sepa cosas de la persona y pueda
 * navegar a la cartelera pública.
 */
export const dynamic = "force-static";

export function GET() {
	return new Response(portablePrompt(), {
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "public, max-age=300",
		},
	});
}
