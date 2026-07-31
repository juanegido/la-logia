---
name: freeticket-comprar
description: Buy tickets on FreeTicket (LATAM ticketing, Colombia-first) on behalf of a human buyer using the public B2C API — discover events by text/date/price, read live per-ticket-type stock, build an order and hand the human a Mercado Pago checkout link, then confirm the issued tickets and resend the QR by email. Needs no credentials and no install (plain HTTP). Use it when the user wants to find a show, check availability or prices, buy or reserve tickets, ask "what's on in Bogotá this weekend", recover a ticket they lost, or check whether an order went through. The agent never handles card or payment data — the human always pays in Mercado Pago.
---

# FreeTicket — buying tickets (B2C)

This skill lets the agent act as a **buyer's agent**: discover events, read live
stock, assemble an order, and hand off to a human-completed payment. It talks to
the **public B2C API** (`/api/public`) — no auth, no API key, no install.

> **Output language:** FreeTicket is a LATAM (Colombia-first) platform. These
> instructions are in English for global reuse, but **all buyer-facing copy the
> agent produces must be in neutral Spanish** (tú / impersonal, **never voseo**).
> See `references/copy.md`. That is a hard product rule, not a preference.

> **Payment boundary (absolute):** the agent **never** asks for, stores, relays
> or types a card number, CVV, PSE credential or Mercado Pago password. The only
> correct action is to give the human the `checkoutUrl` and let them pay. If the
> user offers card data, refuse and re-send the link.

## When to use this skill

- "¿Qué shows hay en Bogotá este fin de semana?" — discovery by text, date, price.
- "¿Cuánto cuesta X?" / "¿Quedan boletas?" — live price and stock.
- "Cómprame 2 entradas para X" — build the order, hand over the payment link.
- "¿Ya me llegó la entrada?" / "Perdí el correo" — order status, resend the QR.

For anything on the **organizer** side (creating events, reports, refunds, door
check-in) this is the wrong skill — use `freeticket-cli` / `freeticket-eventos`,
which need a workspace credential.

## Setup

None. Base URL, no auth:

```
https://appfreeticket.com/api/public
```

Every success is wrapped in `{"data": …}`. Every failure is
`{"error": {"code": "...", "message": "..."}}` with a real HTTP status.
Full verified contract: `references/api.md`.

If the FreeTicket MCP server is already connected, the equivalent `public_*`
tools work too and need no credentials — see the transport section in
`references/api.md`. The rules below apply identically either way; the `city`
bug in rule 8 affects the MCP tool as well.

## The flow

**1 — Discover.** `GET /events?q=…&from=…&to=…&sort=…`
Only `PUBLISHED` events with at least one future date are ever returned.

**2 — Read live stock.** `GET /events/{slug}/availability`
This is the **only** trustworthy source of `price`, `available`, `soldOut`,
`maxPerOrder` and the `ticketTypeId` you need to order. Always call it
immediately before building an order — never order from a cached catalogue.

**3 — Confirm with the human.** Show event, date **in the date's own timezone**,
ticket type, unit price, quantity and total. Get an explicit yes.

**4 — Create the order.** `POST /orders` with `buyerEmail`, `buyerName` and
`items[{ticketTypeId, quantity}]`. Returns `checkoutUrl` + `orderId`.
This creates a **real PENDING sale and holds stock for 30 minutes.**

**5 — Hand off.** Give the human the `checkoutUrl`. Stop. Do not poll in a tight
loop; the hold is 30 minutes, so check back when they say they've paid.

**6 — Confirm.** `GET /orders/{id}` → `paid` returns the issued `tickets[]`.
The QR arrives by email; `POST /tickets/{code}/resend` re-sends it.

## Product rules (non-negotiable, verified against the live API)

1. **Amounts are whole currency units, not cents.** `price: 50000` with
   `currency: "COP"` is **$50.000 COP**. Never divide by 100. Format Colombian
   pesos with `.` as the thousands separator: `$50.000`.

2. **Render every date in its own `timezone`, never in UTC.** `startsAt` is UTC
   ISO; each date carries an IANA `timezone` (typically `America/Bogota`, UTC−5).
   Evening shows minus five hours means **most of the catalogue falls on a
   different calendar day in UTC than it does locally** — 47 of 50 events when
   last measured. A show at `2026-07-30T01:00:00.000Z` is **Wed 29 July, 8:00 PM**
   in Bogotá, not Thursday the 30th. Print the raw UTC and you tell the buyer the
   wrong **day**; this is the single most common way an agent burns a customer here.

3. **Two quantity ceilings, both binding.** Per order the API caps `quantity` at
   50, but each ticket type carries its own `maxPerOrder` (commonly 6). Respect
   the **lower** of the two, and never exceed `available`.

4. **`POST /orders` is not idempotent.** There is no dedupe store and no
   `Idempotency-Key` support yet (see `references/api.md`). A blind retry creates
   a **second real sale**. On timeout or unclear failure: do **not** retry —
   tell the human, and reconcile with `GET /orders/{id}` if you captured an id.

5. **Scope of the public checkout.** General admission only — **no** numbered
   seating, **no** members-only tickets, and **one organizer per order**. If the
   buyer wants a seat map or a members-only presale, send them to the event page
   on the web; the API cannot do it.

6. **Presales are members-only.** If a ticket type isn't purchasable yet, the
   path is a membership on the artist's page, not a retry loop.

7. **`resend` is rate-limited to 1/min per ticket code** and returns only a
   **masked** email. Never claim to know the buyer's full address.

8. **`city` filter is broken — do not use it.** `GET /events?city=…` returns an
   empty list for **every** value, including exact strings the API itself emits.
   The same applies to the `city` argument of the `public_events_list` MCP tool,
   which passes it straight through. Filter by city **client-side** on the `city`
   field, or use `q`. Never report "no hay eventos en tu ciudad" from a `city`
   query — that answer is always false. Details and repro: `references/api.md`.

## Worked example

```bash
BASE=https://appfreeticket.com/api/public

# 1. discover (city filter is broken → filter client-side)
curl -s "$BASE/events?q=comedia&sort=date_asc" \
  | jq '[.data[] | select(.city=="Bogotá")] | .[0:5]'

# 2. live stock — the only source of ticketTypeId and real price
curl -s "$BASE/events/severas-locas-julio/availability" \
  | jq '.data.dates[] | {startsAt, timezone, venueName,
        types: [.ticketTypes[] | {id, name, price, available, soldOut, maxPerOrder}]}'

# 3. render the date in ITS timezone before showing the human
TZ=America/Bogota date -jf "%Y-%m-%dT%H:%M:%S" "2026-07-30T01:00:00" "+%a %d %b %I:%M %p"

# 4. create the order — ONLY after explicit human confirmation. Not idempotent.
curl -s -X POST "$BASE/orders" -H 'Content-Type: application/json' -d '{
  "buyerEmail": "…", "buyerName": "…",
  "items": [{"ticketTypeId": "…", "quantity": 2}]
}' | jq '{orderId, reference, total, currency, checkoutUrl}'

# 5. after the human says they paid
curl -s "$BASE/orders/<orderId>" | jq '{status, tickets}'
```

## What NOT to do

- **Never** touch payment data. Hand over `checkoutUrl` and stop.
- **Never** create an order without explicit, itemised human confirmation — it
  reserves real stock and creates a real sale.
- **Never** retry `POST /orders` blindly. It duplicates the sale.
- **Never** show a UTC timestamp as the show time, or divide COP by 100.
- **Never** invent stock, price or a `ticketTypeId` — read `availability`.
- **Never** use `?city=` and report "no hay eventos": that's the bug, not reality.
- Don't promise a delivery time for the QR email; confirm with `GET /orders/{id}`.
- Don't use voseo ("comprá", "elegí") in buyer-facing copy — see `references/copy.md`.
