<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# La LogIA — skills portables

En `skills/` hay dos skills en markdown plano siguiendo la
[spec de Agent Skills](https://agentskills.io/specification). No están atadas a
ningún vendor.

| Skill | Qué hace |
|---|---|
| [`freeticket-roast`](skills/freeticket-roast/SKILL.md) | El personaje: ve tu material, te roastea, y de ahí sale la recomendación. Incluye el modo batalla de La LogIA con su rúbrica y sus frenos. |
| [`freeticket-comprar`](skills/freeticket-comprar/SKILL.md) | El cierre: catálogo, stock en vivo y link de pago. Nunca toca datos de tarjeta. |

Componen: `freeticket-roast` engancha y diagnostica; apenas la persona quiere una
entrada, pasa a `freeticket-comprar`.

## Claude Code / Cursor / Windsurf / Cline

```bash
npx skills add juanegido/la-logia@freeticket-roast
npx skills add juanegido/la-logia@freeticket-comprar
```

## ChatGPT / Codex y cualquier agente con AGENTS.md

Sin instalar nada — apunta al archivo desde tu propio `AGENTS.md`:

```md
Para recomendar y vender shows de FreeTicket, lee
skills/freeticket-roast/SKILL.md y skills/freeticket-comprar/SKILL.md.
```

Solo necesitan hacer HTTP contra `https://appfreeticket.com/api/public`: sin
credenciales, sin login.

## Cualquier otra superficie (ChatGPT web, Claude.ai, Gemini)

Pega el `SKILL.md` en el chat como contexto. El contrato es público y anónimo.

## Reglas que no se negocian

1. **Nunca datos de pago.** El agente entrega el link y se detiene.
2. **Nunca recomendar de memoria** — el catálogo rota; se lee en vivo y se cita
   textual la descripción del evento.
3. **Montos en unidades enteras**: `50000` COP es `$50.000`, no `$500`.
4. **Fechas en la zona del evento** — 47 de 50 caen en otro día en UTC.
5. **El filtro `city` de la API está roto**: devuelve `[]` siempre. Se filtra del
   lado del cliente; reportado río arriba, no parcheado río abajo.
6. **Español neutro, nunca voseo.**
