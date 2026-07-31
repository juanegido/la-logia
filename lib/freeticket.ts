/**
 * Cliente del contrato público B2C de FreeTicket (`/api/public`, 0.3.0).
 * Sin credenciales: cada endpoint es anónimo.
 *
 * Las dos trampas del contrato, resueltas acá una sola vez para que ninguna
 * parte de la app las repita:
 *  - Los montos vienen en **unidades enteras**, no centavos. 50000 COP = $50.000.
 *  - `startsAt` es UTC y cada fecha trae su `timezone` IANA. 47 de 50 eventos del
 *    catálogo caen en otro día calendario en UTC que en hora local.
 */

export const FT_BASE = "https://appfreeticket.com/api/public";

export interface PublicEventSummary {
	slug: string;
	name: string;
	description: string | null;
	coverImageUrl: string | null;
	city: string | null;
	nextDate: string | null;
	priceFrom: number | null;
	currency: string;
}

export interface PublicTicketType {
	id: string;
	name: string;
	description: string | null;
	price: number;
	currency: string;
	maxPerOrder: number;
	available: number;
	soldOut: boolean;
}

export interface PublicAvailabilityDate {
	id: string;
	label: string | null;
	startsAt: string;
	endsAt: string | null;
	timezone: string;
	venueName: string | null;
	city: string | null;
	ticketTypes: PublicTicketType[];
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
	const url = new URL(FT_BASE + path);
	for (const [k, v] of Object.entries(params ?? {})) {
		if (v) url.searchParams.set(k, v);
	}
	const res = await fetch(url, {
		headers: { accept: "application/json" },
		// El stock se mueve; no cachear disponibilidad.
		cache: "no-store",
	});
	const body = (await res.json()) as { data?: T; error?: { message?: string } };
	if (!res.ok || body.error) {
		throw new Error(body.error?.message ?? `FreeTicket ${res.status}`);
	}
	return body.data as T;
}

export interface SearchArgs {
	q?: string;
	city?: string;
	from?: string;
	to?: string;
	sort?: "date_asc" | "price_asc" | "price_desc";
	limit?: number;
}

/**
 * Catálogo. **El filtro `city` de la API está roto** — devuelve `[]` para todo
 * valor, incluso las cadenas exactas que la propia API emite (`?city=Bogotá` → 0
 * con 27 eventos en Bogotá). Así que nunca se manda: se pide el catálogo y se
 * filtra la ciudad acá. Reportado, no parcheado río abajo:
 * github.com/juanegido/freeticket-plugin
 */
export async function searchEvents(a: SearchArgs): Promise<PublicEventSummary[]> {
	const events = await get<PublicEventSummary[]>("/events", {
		q: a.q ?? "",
		from: a.from ?? "",
		to: a.to ?? "",
		sort: a.sort ?? "date_asc",
		pageSize: "50",
	});

	const wanted = a.city?.trim().toLowerCase();
	const norm = (s: string) =>
		s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

	const filtered = wanted
		? events.filter((e) => e.city && norm(e.city).includes(norm(wanted)))
		: events;

	return filtered.slice(0, a.limit ?? 8);
}

export function getEvent(slug: string) {
	return get<PublicEventSummary & { dates: PublicAvailabilityDate[] }>(
		`/events/${encodeURIComponent(slug)}`,
	);
}

export function getAvailability(slug: string) {
	return get<{ slug: string; dates: PublicAvailabilityDate[] }>(
		`/events/${encodeURIComponent(slug)}/availability`,
	);
}

/** Monto en unidades enteras. `money(50000,"COP")` → `$50.000`. Nunca /100. */
export function money(amount: number, currency: string): string {
	try {
		const parts = new Intl.NumberFormat("es-CO", {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		}).formatToParts(amount);
		const sym = parts.find((p) => p.type === "currency")?.value ?? "";
		const glue = /\$$/.test(sym) ? "" : " ";
		return parts
			.map((p) => (p.type === "literal" ? glue : p.value))
			.join("")
			.trim();
	} catch {
		return `${amount.toLocaleString("es-CO")} ${currency}`;
	}
}

/** Fecha en la zona IANA del evento. Nunca en UTC. */
export function dateInTz(iso: string, tz: string): string {
	try {
		return new Intl.DateTimeFormat("es-CO", {
			timeZone: tz,
			weekday: "short",
			day: "2-digit",
			month: "short",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
			.formatToParts(new Date(iso))
			.map((p) => {
				if (p.type === "weekday" || p.type === "month")
					return p.value.replace(/\.$/, "");
				if (p.type === "dayPeriod") return p.value.replace(/\s+/gu, "");
				return p.value;
			})
			.join("")
			.replace(/\p{Zs}/gu, " ")
			.trim();
	} catch {
		return iso;
	}
}

export function eventUrl(slug: string): string {
	return `https://appfreeticket.com/eventos/${encodeURIComponent(slug)}`;
}
