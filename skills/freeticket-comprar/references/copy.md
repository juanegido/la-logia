# Buyer-facing copy — neutral Spanish

Everything the buyer reads goes through here. The skill's instructions are in
English; the **output is always Spanish**.

## Hard rules

1. **Neutral Spanish, tú or impersonal. Never voseo.**
   ❌ `comprá` · `elegí` · `revisá` · `tenés`
   ✅ `compra` · `elige` · `revisa` · `tienes`
2. **No tech jargon.** The buyer never sees `ticketTypeId`, `slug`, `PENDING`,
   `checkoutUrl`, `cuid`, `422`, `availability`. Say *entrada*, *función*,
   *link de pago*, *orden*.
3. **No emojis** in product copy — it's a FreeTicket brand rule.
4. **No AI filler.** Banned: "Eleva tu experiencia", "sin fricción", "próxima
   generación", "descubre el poder de". Say the thing.
5. **Money:** `$50.000 COP` — `.` for thousands. Never `50000` bare, never cents.
6. **Dates:** local wall-clock in the venue's timezone, spelled out.
   `mié 29 de julio, 8:00 p. m.` Never a UTC string, never an ISO timestamp.
7. **First person plural** for brand moments ("te enviamos", "te confirmamos"),
   never third person ("la plataforma enviará").

## Templates

### Showing results

> Encontré 3 funciones de **SEVERAS LOCAS** en Bogotá:
>
> 1. **mié 29 de julio, 8:00 p. m.** — desde $50.000
> 2. **jue 6 de agosto, 8:00 p. m.** — desde $50.000
>
> ¿Cuál te interesa?

Nothing found:

> No hay funciones de *«{búsqueda}»* con entradas a la venta en este momento.
> ¿Quieres que busque en otra ciudad o en otras fechas?

Never phrase this from a `?city=` response — that filter is broken and the answer
would be false. Filter client-side first.

### Confirming before the order

Always itemised, always with an explicit question. This is the consent gate.

> Antes de continuar, confirma que está bien:
>
> - **Evento:** SEVERAS LOCAS — JULIO
> - **Función:** mié 29 de julio, 8:00 p. m. (Bogotá)
> - **Entradas:** 2 × General — $50.000 cada una
> - **Total:** $100.000 COP
> - **Correo:** ana@ejemplo.com
>
> ¿Confirmo la compra? Te paso el link para pagar.

### Handing off the payment

> Listo. Aparté tus 2 entradas por **30 minutos**.
>
> Paga aquí: {checkoutUrl}
>
> El pago lo haces directamente en Mercado Pago — yo no manejo datos de tu
> tarjeta. Cuando termines, dime y confirmo que quedó.

If the user offers card details:

> No necesito los datos de tu tarjeta y no puedo recibirlos. El pago se hace
> solo en la página de Mercado Pago: {checkoutUrl}

### Confirming the purchase

> Tu compra quedó confirmada. Te emitimos 2 entradas y te las enviamos a
> ana@ejemplo.com con su código QR.
>
> Muestra el QR en la puerta. Si no te llegó el correo, dime y te lo reenvío.

Still pending:

> Todavía no veo el pago confirmado. Si acabas de pagar, espera un momento y lo
> vuelvo a revisar. El apartado dura 30 minutos desde que generamos el link.

Expired:

> Se venció el apartado de 30 minutos y las entradas volvieron a estar
> disponibles. ¿Quieres que arme la orden de nuevo?

### Resend

> Te reenvié la entrada a a•••@ejemplo.com. Puede tardar unos minutos en llegar.

Only ever the masked address the API returns. Rate limit is 1/min per ticket:

> Acabo de reenviarlo hace menos de un minuto. Esperemos un momento antes de
> intentar otra vez.

### Out of scope

Numbered seating / members-only:

> Esta función tiene puestos numerados y hay que elegir la silla en el mapa del
> recinto. Puedes comprarla directo aquí: https://appfreeticket.com/eventos/{slug}

> Estas entradas son solo para miembros de la comunidad del artista. Si te haces
> miembro, tienes acceso a la preventa antes que el público general.

Sold out:

> **General** está agotada para esa función. Quedan entradas para {otra función}.
> ¿Te muestro esas?
