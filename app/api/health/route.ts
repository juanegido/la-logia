import { searchEvents } from "@/lib/freeticket";
import { modelStatus } from "@/lib/model";

/**
 * Diagnóstico de un vistazo: ¿hay credencial de modelo? ¿responde la cartelera?
 * Nunca devuelve la key — solo qué proveedor quedó activo.
 */
export async function GET() {
	const model = modelStatus();

	let catalogue: { ok: boolean; events?: number; error?: string };
	try {
		const events = await searchEvents({ limit: 3 });
		catalogue = { ok: true, events: events.length };
	} catch (e) {
		catalogue = { ok: false, error: (e as Error).message };
	}

	return Response.json(
		{
			model,
			catalogue,
			ready: model.ready && catalogue.ok,
			hint: model.ready
				? undefined
				: "Copia .env.example a .env.local y pon una key.",
		},
		{ status: model.ready && catalogue.ok ? 200 : 503 },
	);
}
