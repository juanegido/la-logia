# FreeTicket public B2C API — verified contract

Base URL: `https://appfreeticket.com/api/public` · spec:
[`/api/public/openapi.json`](https://appfreeticket.com/api/public/openapi.json)
(OpenAPI 3.1, "FreeTicket Public API" **0.3.0**). No authentication.

Every field below was checked against the live API on **2026-07-29**, not just
read off the spec. Where live behaviour and spec disagree, both are recorded.

## Envelopes

| | Shape |
|---|---|
| Success | `{"data": …}` |
| Failure | `{"error": {"code": "NOT_FOUND", "message": "Evento no encontrado."}}` |

Error messages are **Spanish** — they are safe to surface to a buyer, but prefer
your own copy (`copy.md`) over raw API text.

⚠️ **There is no `meta` object.** The list endpoint takes `page`/`pageSize` but
returns no total, no page count and no cursor — the response is a bare `data`
array. To walk the catalogue, page until you get a short page. You cannot show
the buyer "página 2 de 7", because the API does not tell you.

## `GET /events` — catalogue

Returns `PublicEventSummary[]`. Only `PUBLISHED` events with ≥1 future date.

| Param | Verified behaviour |
|---|---|
| `q` | ✅ Works. Matches name + description, accent/case-insensitive. `q=terapia` → 2, `q=gordo` → 14. |
| `city` | ❌ **Broken — always 0 results.** See below. |
| `from` / `to` | ✅ Work. ISO 8601, filter on show dates. |
| `page` | ✅ Works. 1-based. |
| `pageSize` | ✅ Works. Spec says max 50. `pageSize=51` returns **HTTP 200**, not 422 — the cap is silently applied, so don't rely on a validation error to catch it. |
| `sort` | ✅ Works. `date_asc` \| `price_asc` \| `price_desc`. |

`PublicEventSummary`: `slug`, `name`, `description`, `coverImageUrl`, `city`,
`nextDate`, `priceFrom`, `currency`. All nullable except `slug`/`name`/`currency`.

### ❌ The `city` filter is non-functional

`GET /events?city=<anything>` returns `{"data": []}` for **every** input tested:

```
city=Bogotá  → 0     city=Bogota  → 0     city=bogota → 0
city=bogotá  → 0     city=BOGOTÁ  → 0     city=Cúcuta → 0
city=Cucuta  → 0     city=Pasto   → 0     city=Mosquera → 0
```

…while the unfiltered catalogue returns 50 events across 19 cities, **27 of them
`"city": "Bogotá"`**. It is not an accent, case or encoding problem: it fails on
the exact byte-for-byte string the API itself emits.

It also fails when the venue is fully linked. `gordo-y-feo-mosquera` reports
`city: "Mosquera"` at both summary level *and* inside `dates[].city`, with
`venueName: "Auditorio Municipal Mosquera"` — and `?city=Mosquera` still returns 0.

Every other filter on the same endpoint works, which isolates the fault to
`city` alone rather than to query parsing.

**Repro:** [`findings/repro-city-filter.sh`](../../../findings/repro-city-filter.sh)

**Workaround for agents:** fetch with `q`/`from`/`to`/`sort`, then filter on the
`city` field client-side. Never tell a buyer "no hay eventos en tu ciudad" from
a `?city=` response — that answer is always wrong.

## `GET /events/{slug}` — detail

`PublicEventDetail` = summary + `dates[]` (`PublicEventDate`):
`id`, `label`, `startsAt`, `endsAt`, `timezone`, `venueName`, `city`.

`venueName` and `city` are frequently `null` on a date even when the event
summary has a city (e.g. `severas-locas-julio`). Fall back to the summary
`city`, and don't render "null" at a buyer.

404 on an unknown slug: `{"error":{"code":"NOT_FOUND","message":"Evento no encontrado."}}`

## `GET /events/{slug}/availability` — live stock

The **authoritative** source for ordering. Returns `dates[]`, each with
`ticketTypes[]` (`PublicTicketType`):

| Field | Meaning |
|---|---|
| `id` | The `ticketTypeId` for `POST /orders`. Only source of it. |
| `price` / `currency` | Whole units. `50000` + `COP` = **$50.000**, not cents. |
| `available` | `capacity − sold − reserved`, live. |
| `soldOut` | Boolean; check it, don't infer from `available`. |
| `maxPerOrder` | Per-type ceiling, commonly `6`. Binding. |

Future dates only. The spec explicitly says **do not cache aggressively** — stock
moves. Call it immediately before every order.

Live sample (`severas-locas-julio`, 2026-07-29):

```json
{ "id": "cmqlhjcay000a04jp5bwb1n1r", "name": "General",
  "description": "Ticket válido para una persona.",
  "price": 50000, "currency": "COP",
  "maxPerOrder": 6, "available": 99, "soldOut": false }
```

### The timezone trap

`startsAt` is UTC; the sibling `timezone` is IANA (`America/Bogota`, UTC−5).
That same event: `startsAt: "2026-07-30T01:00:00.000Z"` → **Wed 29 Jul, 8:00 PM**
in Bogotá. Render it raw and you move the show a day later and lose the buyer.

This is not an edge case. Evening start times minus five hours means **47 of the
50 events** in the live catalogue sit on a different calendar day in UTC than they
do locally — measured 2026-07-29. Two of them cross a **month** boundary, and one
names its date in its own slug:

| Event | `nextDate` (UTC) | Local (America/Bogota) |
|---|---|---|
| `no-me-dejan-mentir-31-de-julio` | `2026-08-01T01:00:00.000Z` | **31 July**, 8:00 PM |
| `mas-verde-y-menos-viejo` | `2026-08-01T01:00:00.000Z` | **31 July**, 8:00 PM |

A naive render announces "1 de agosto" for a show the organizer titled
*31 de julio*. Always convert with the date's own `timezone`.

## `POST /orders` — create order, get payment link

Body (`CreateOrderRequest`):

```json
{ "buyerEmail": "…",            // required, RFC-ish email pattern enforced
  "buyerName": "…",             // required, minLength 1
  "buyerPhone": "…",            // optional
  "items": [ { "ticketTypeId": "…", "quantity": 2 } ] }   // required, ≥1 item
```

`quantity`: integer, `> 0`, **max 50** by schema — but `maxPerOrder` on the
ticket type is usually lower and also binding. Use the smaller.

Returns **201** `OrderCreated`: `orderId`, `reference`, `status`, `total`,
`currency`, `checkoutUrl`.

Side effects, per the spec: creates a **PENDING sale**, reserves stock for
**30 minutes** under a `Serializable` transaction, and creates a **real Mercado
Pago preference**. Scope: general admission only, not numbered, not members-only,
`PUBLISHED` with sales open, **one organizer per order**.

### ⚠️ Not idempotent

The upstream roadmap ships `Idempotency-Key` as a **header** on this route, but
FreeTicket's own [`ROADMAP-AI-FIRST.md`](https://github.com/AppFreeticket/ai-native/blob/main/ROADMAP-AI-FIRST.md)
records it as *"pendiente — el builder OpenAPI no soporta header params aún y no
hay store de dedupe"*. The header is absent from the 0.3.0 spec, so **assume no
dedupe**: one retry = one extra real sale. Never auto-retry. Surface the failure
to the human instead.

> FreeTicket also flags this route as **pending QA before prod** in their own
> roadmap: *"el checkout anónimo crea ventas + preferencias MP reales… falta test
> de integración con DB."* Treat every call as production-affecting. Do not
> exercise it for testing.

## `GET /orders/{id}` — order status

`OrderStatus`: `orderId`, `reference`, `status`, `total`, `currency`, `tickets[]`.
`status` ∈ `pending` | `paid` | `expired` | `cancelled`. `tickets[]`
(`ticketCode`, `ticketTypeName`) populates once `paid`.

`id` is a non-enumerable cuid and the response exposes **no buyer data** — safe
to poll, but poll on a human signal, not in a loop.

## `POST /tickets/{code}/resend` — re-send the QR

Optional body `{"email": "…"}`; if supplied it **must match** the buyer's
address. Returns `{"sent": true, "maskedEmail": "…"}` — masked, never full.
**Rate limit: 1 per minute per ticket code.** Back off; don't hammer it.

## Transport: raw HTTP or the anonymous MCP endpoint

Both work; this skill documents raw HTTP because it has no dependencies at all.

**Option A — raw HTTP** (everything above). Nothing to install, no credentials.

**Option B — the anonymous public MCP endpoint.** `@freeticket/mcp` 0.10.0 added
`POST https://mcp.appfreeticket.com/mcp/public`, which serves **only** the B2C
tools and needs **no credentials** ("buyer agents have no account"). Verified live
2026-07-29: `tools/list` returns 200 and six tools.

| Tool | Wraps |
|---|---|
| `public_events_list` | `GET /public/events` |
| `public_events_get` | `GET /public/events/{slug}` |
| `public_events_availability` | `GET /public/events/{slug}/availability` |
| `public_orders_create` | `POST /public/orders` — carries `idempotentHint: false` |
| `public_orders_get` | `GET /public/orders/{id}` |
| `public_tickets_resend` | `POST /public/tickets/{code}/resend` |

Note `public_orders_create` is annotated `idempotentHint: false` by FreeTicket
themselves — the no-retry rule above is their own stated position, not our
inference.

⚠️ **`public_events_list` exposes `city` as a tool parameter** ("Filtrar por
ciudad") and therefore inherits the bug verbatim: called anonymously in
production, `public_events_list(city: "Bogotá")` returns **0** events while the
unfiltered call returns 50, 27 of them in Bogotá. The MCP client is not at fault
— `src/tools/public.ts` passes `city` through as a plain
`z.string().optional()`. The fault is server-side.

## Related contracts (not this skill)

| Contract | Auth | Use |
|---|---|---|
| [`/api/v1/openapi.json`](https://appfreeticket.com/api/v1/openapi.json) B2B 1.5.0, 44 paths | API key + `X-Workspace-Id` | Organizer side → `freeticket-cli` |
| `/api/admin` | `SUPER_ADMIN` cookie | Platform ops |

`POST /mcp` (the B2B/admin surface) answers **401** with
`WWW-Authenticate: Bearer resource_metadata="…"` — that challenge is the
intended OAuth trigger, not a misconfiguration. The embedded OAuth 2.1
authorization server is fully live: RFC 8414 + RFC 9728 discovery,
`/authorize` · `/token` · `/register`, PKCE `S256`, scopes `b2b` and `admin`.

`@freeticket/mcp` is at **0.11.0** in git but **does not resolve on npm** (404) as
of 2026-07-29, so `npx -y @freeticket/mcp` has nothing to install. The remote
`/mcp/public` endpoint is the only zero-install MCP path today — and raw HTTP
needs no install either, which is why this skill uses it.
