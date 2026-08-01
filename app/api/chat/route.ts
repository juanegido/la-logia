import {
	convertToModelMessages,
	createUIMessageStreamResponse,
	isStepCount,
	streamText,
	tool,
	toUIMessageStream,
	type UIMessage,
} from "ai";
import { z } from "zod";

import {
	dateInTz,
	eventUrl,
	getAvailability,
	money,
	nextShowOf,
	searchEvents,
} from "@/lib/freeticket";
import { findPersona } from "@/lib/personas";
import { resolveModel } from "@/lib/model";
import { systemPrompt, type Memory } from "@/lib/prompt";

export const maxDuration = 60;

/**
 * Tools sobre el contrato público de FreeTicket. Todas son de **lectura**.
 *
 * No hay tool de compra a propósito: `POST /public/orders` crea una venta
 * PENDING y una preferencia de Mercado Pago **reales**, y el propio roadmap de
 * FreeTicket lo marca "pendiente de QA antes de prod". Un demo público no llena
 * la base de datos de nadie con órdenes de mentira — el cierre es el link al
 * evento y el humano compra ahí.
 */
const tools = {
	buscar_eventos: tool({
		description:
			"Busca shows en el catálogo público de FreeTicket. Úsalo SIEMPRE antes de recomendar: el catálogo rota y no se recomienda de memoria. Devuelve la descripción de cada show para que cites textual la evidencia.",
		inputSchema: z.object({
			q: z.string().optional().describe("Texto libre: tema, comediante, formato"),
			city: z
				.string()
				.optional()
				.describe("Ciudad, p. ej. Bogotá. Se filtra del lado del cliente."),
			sort: z.enum(["date_asc", "price_asc", "price_desc"]).optional(),
		}),
		execute: async ({ q, city, sort }) => {
			const events = await searchEvents({ q, city, sort, limit: 8 });
			return {
				count: events.length,
				events: events.map((e) => ({
					slug: e.slug,
					nombre: e.name,
					descripcion: e.description,
					ciudad: e.city,
					// Formateado acá: el modelo nunca debe ver un UTC crudo y
					// arriesgarse a mostrarlo.
					proxima_fecha: e.nextDate
						? dateInTz(e.nextDate, "America/Bogota")
						: null,
					desde: e.priceFrom !== null ? money(e.priceFrom, e.currency) : null,
					url: eventUrl(e.slug),
				})),
			};
		},
	}),

	ver_disponibilidad: tool({
		description:
			"Stock en vivo de un show por fecha y tipo de entrada. Úsalo antes de afirmar que quedan entradas o cuánto valen.",
		inputSchema: z.object({ slug: z.string().describe("Slug del evento") }),
		execute: async ({ slug }) => {
			const a = await getAvailability(slug);
			return {
				slug: a.slug,
				fechas: a.dates.map((d) => ({
					cuando: dateInTz(d.startsAt, d.timezone),
					lugar: d.venueName,
					ciudad: d.city,
					entradas: d.ticketTypes.map((t) => ({
						nombre: t.name,
						precio: money(t.price, t.currency),
						disponibles: t.available,
						agotado: t.soldOut,
						max_por_orden: t.maxPerOrder,
					})),
				})),
			};
		},
	}),

	link_evento: tool({
		description:
			"Devuelve el link oficial del evento para que la persona compre ahí. Este es el cierre: el agente nunca procesa el pago ni pide datos de tarjeta.",
		inputSchema: z.object({ slug: z.string() }),
		execute: async ({ slug }) => ({
			url: eventUrl(slug),
			nota: "El pago se hace en la página del evento, con Mercado Pago.",
		}),
	}),

	proximo_del_rival: tool({
		description:
			"Tu próxima fecha en cartelera cuando estás peleando como uno de los comediantes del roster, con stock y precio reales. Úsala para cerrar el roast vendiendo tu propio show. Si devuelve null, no tienes fecha: dilo, no la inventes.",
		inputSchema: z.object({
			persona: z
				.string()
				.describe("Id del rival: murillo, mateus, bart, velandia, vela, chimuelo, nadapersonal, torres"),
		}),
		execute: async ({ persona }) => {
			const p = findPersona(persona);
			if (!p) return { error: `No conozco al rival "${persona}".` };
			const show = await nextShowOf(p.search, p.match);
			return show
				? { comediante: p.name, ...show }
				: {
						comediante: p.name,
						sin_fecha: true,
						nota: "No tiene fecha futura en cartelera. Dilo y recomienda otro show.",
					};
		},
	}),

	recordar: tool({
		description:
			"Guarda lo que sabes de la persona para las próximas conversaciones: su ciudad, sus gustos, o un show que quiere seguir. Llámalo apenas lo diga, sin anunciarlo.",
		inputSchema: z.object({
			city: z.string().optional().describe("Ciudad de la persona"),
			interest: z.string().optional().describe("Un gusto o tema, en 2-4 palabras"),
			watching: z.string().optional().describe("Slug o nombre de un show a seguir"),
		}),
		// El estado vive en el cliente (localStorage) y vuelve en cada request.
		// El servidor es stateless: sin base de datos, sin cookies, sin PII.
		execute: async (patch) => ({ guardado: true, ...patch }),
	}),
};

export async function POST(req: Request) {
	const {
		messages,
		memory,
		persona,
	}: { messages: UIMessage[]; memory?: Memory; persona?: string } =
		await req.json();

	const { model } = resolveModel();

	const result = streamText({
		model,
		system: systemPrompt(memory ?? {}, persona),
		messages: await convertToModelMessages(messages),
		tools,
		stopWhen: isStepCount(6),
	});

	return createUIMessageStreamResponse({
		stream: toUIMessageStream({ stream: result.stream }),
	});
}
