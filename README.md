<div align="center">

# La Log*IA*

**Un agente que te roastea, te encuentra el show que te mereces en la cartelera real de FreeTicket, y se queda contigo para el próximo.**

[Skills portables](AGENTS.md) · [Contrato público](https://appfreeticket.com/api/public/openapi.json) · [Hallazgos y bug report](https://github.com/juanegido/freeticket-plugin)

</div>

---

## La idea

**LA LOGIA** es un show real de FreeTicket: un formato de roast traído de México
por Tío Robert, que se presenta en el Boom Stand Up Bar de Bogotá. Su propia
descripción define el producto:

> "Una variación de la stand-up cuya esencia es **el homenaje a través del
> bullying**… las mejores plumas de la stand-up colombiana hacen roast a sus
> colegas **luego de ver su material**."

De ahí salen las dos reglas del agente, y ninguna es invención mía:

1. **"Luego de ver su material."** Primero pregunta, después pega. No es un paso
   de UX que se pueda saltar: es el formato.
2. **"Homenaje a través del bullying."** Tiene que aterrizar con cariño o no es
   La Logia. Los frenos no son ética importada — son fidelidad al show.

El embudo es el de FreeTicket contado como agente. Su propia página
[`/nosotros`](https://appfreeticket.com/nosotros) lo dice: *"Primero, una app
para nuestros fans… Luego, membresías… Con el tiempo, una comunidad de verdad."*

**Gancho → entrada → y te quedas con el agente.** Ese último paso es el que su
tesis necesita: *"llenar un evento no es vender tickets — es construir una
comunidad que quiera volver."*

## Qué hace, de verdad

Todo contra el contrato público (`/api/public`), sin credenciales:

| Tool | Qué hace |
|---|---|
| `buscar_eventos` | Cartelera en vivo. Devuelve la descripción de cada show para poder citarla. |
| `ver_disponibilidad` | Stock, precio y máximo por orden, en vivo. |
| `link_evento` | El cierre: el link oficial donde la persona compra. |
| `recordar` | Ciudad, gustos y shows que sigue. Vive en tu navegador. |

Una respuesta real de este demo, sin retocar:

> Tres viernes seguidos en la casa, la misma playlist desde 2019 y encima
> Bogotá — o sea, ni el clima te da excusa nueva…
>
> Ahora el giro: la misma rutina que te tiene frita es justo lo que un show te
> puede romper. **¡HÁGAME CASO!**, que según la descripción *"trae variedad para
> hacerlos olvidarse de la rutina y la monotonía"*. Literal el antídoto a tu
> playlist congelada.
>
> Bogotá · vie 31 de julio, 9:30 p.m. · desde $50.000 · quedan 66

El show, la fecha, el precio y el stock salieron de la API en esa misma
respuesta. La cita es textual de la descripción del evento: **sin cita no hay
recomendación**, porque el catálogo rota cada semana y recomendar de memoria es
inventar.

## Correrlo

```bash
pnpm install
cp .env.example .env.local   # UNA key: Anthropic, OpenAI, Gemini o AI Gateway
pnpm dev
```

`GET /api/health` dice si hay credencial y si la cartelera responde, sin exponer
la key:

```json
{ "model": { "ready": true, "provider": "anthropic:claude-sonnet-5" },
  "catalogue": { "ok": true, "events": 3 }, "ready": true }
```

Sobre el **AI Gateway**: es lo más cómodo (una key, cualquier modelo) pero exige
tarjeta registrada en Vercel; sin ella devuelve `403
customer_verification_required`. Por eso el resolver prueba las keys directas
primero. `LOGIA_PROVIDER` y `LOGIA_MODEL` fuerzan lo que quieras.

## Decisiones que defiendo

**No crea órdenes, a propósito.** `POST /public/orders` genera una venta PENDING
y una preferencia de Mercado Pago **reales**, y el propio roadmap de FreeTicket lo
marca *"pendiente de QA antes de prod"*. Un demo público no llena la base de
datos de nadie con órdenes de mentira: el agente cierra con el link y la persona
compra ahí. Datos de tarjeta no recibe nunca.

**El filtro `city` de la API está roto** — devuelve `[]` para todo valor, incluso
las cadenas exactas que la propia API emite (`?city=Bogotá` → 0, habiendo 27
eventos en Bogotá). Acá se filtra del lado del cliente, y **no se parchea río
abajo**: está reportado río arriba con repro en
[`juanegido/freeticket-plugin`](https://github.com/juanegido/freeticket-plugin).

**Las fechas van en la zona del evento.** `startsAt` viene en UTC y 47 de 50
eventos del catálogo caen en otro día calendario en UTC que en hora local. El
formateo ocurre dentro de la tool, en el servidor, para que el modelo nunca vea
un timestamp crudo que pueda mostrar por error.

**Los montos son unidades enteras.** `50000` COP es `$50.000`; dividir por 100
cotiza una entrada de 500 pesos.

**La memoria vive en tu navegador.** `localStorage`, no servidor: sin base de
datos, sin cookies, sin PII. El servidor es stateless y la memoria viaja en cada
request. El día que FreeTicket abra un modelo de credencial para agentes de fan
(`GET /customer/tickets` ya existe, pero pide key enterprise + SSO), esto se
engancha a las entradas reales de la persona.

**Cero emojis**, español neutro, nunca voseo, y los tokens de marca de
[`design.md`](https://appfreeticket.com/design.md). Son sus reglas, no las mías.

## Las skills

El personaje no vive en el prompt: vive en [`skills/`](AGENTS.md), markdown
portable que corre en Claude Code, Cursor, ChatGPT/Codex, o pegado en cualquier
chat. `lib/prompt.ts` es su encarnación en este demo — la skill es la fuente de
verdad.

- [`freeticket-roast`](skills/freeticket-roast/SKILL.md) — el personaje, el modo
  batalla con su rúbrica de cinco ejes, y los frenos.
- [`freeticket-comprar`](skills/freeticket-comprar/SKILL.md) — el cierre: stock,
  confirmación, y el límite de pago.

La rúbrica es la parte que más me importa: **un ataque a una característica que
la persona no eligió puntúa cero el intento completo**, no menos puntos. No es
solo ética — en un roast, pegarle a algo que el otro no eligió es lo más fácil
que hay. Premiar oficio y castigar pereza termina siendo la misma política que
moderar bien.

---

MIT · demo no oficial, construido solo contra el contrato público de FreeTicket.
