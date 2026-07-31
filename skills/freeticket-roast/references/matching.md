# Matching — from the roast to a real show

## The evidence rule

**Never recommend from memory.** The catalogue rotates weekly: `RUMBO AL ESPECIAL`
alone tours 14 cities, and half of what's listed today is gone in a month. Every
recommendation must come from a live read:

```bash
curl -s 'https://appfreeticket.com/api/public/events?pageSize=50&sort=date_asc' | jq '.data'
```

Then match on the event's **own `description`**, and quote the bit you matched
on. That quote is what makes the recommendation land as insight instead of a
guess — and it's what stops the agent inventing a show that fits the joke better
than reality does.

Reminder: `?city=` is broken and returns nothing for every value. Pull the
catalogue and filter on the `city` field client-side (see
`freeticket-comprar/references/api.md`).

## Archetypes present in the catalogue

Captured 2026-07-29 as **worked examples of the method**, not a lookup table.
Re-read live before using any of them.

| The flaw you just roasted | Show it points at | Evidence in its own description |
|---|---|---|
| Asks everyone for advice, takes none | `GORDCONSEJOS` | "hace las veces de terapeuta, consejera, gurú y adivina para solucionarle la vida al público" |
| Takes advice from the worst possible people | `¡QUÉ HPUTA TERAPIA!` | "La persona menos indicada para ser un consejero" |
| Has an opinion on every headline | `SEVERAS LOCAS` | "Actualidad sin anestesia… comedia, crítica y actualidad" |
| Still not over it | `AMORES` | "la vida que nos pasa, la muerte que nos alcanza y el amor que nos revienta" |
| Thought they'd have it figured out by now | `PENSÉ QUE ERA MÁS FÁCIL` | "Solo estás aprendiendo a perder con más estilo" |
| Serially, structurally single | `31 Y TODAVÍA SIN NOVIA` | "cuando el amor sale mal, al menos deja buen material" |
| Thinks everything is about them | `NADA PERSONAL` | "sólo necesitan no creerse el centro del mundo" |
| Argues for sport | `ENTRE LAS PARTES` | "defendemos temas indefendibles con comedia… un solo veredicto: el tuyo" |
| Can't commit to a plan | `COMEDIANTE SORPRESA` | "el que no arriesga no se ríe" |
| Wants blood | `LIGA DE CAMPEONES` | "un público armado de tomates… el formato más exigente" |
| Won't shut up about their trip | `ENTRENAMIENTO A BORDO` | "las historias de los colombianos en el extranjero" |
| Afraid of turning into their parents | `MÁS VERDE Y MENOS VIEJO` | "cómo llegar a viejo sin morir en el intento" |
| Divorce is the personality now | `RUMBO AL ESPECIAL` | "cómo y por qué se me acabó el matrimonio" |

## How to pick when several fit

1. **Actually on sale, actually near them.** A perfect thematic match in Pitalito
   is a worse recommendation than a decent one in their city. Filter first.
2. **Soonest reachable date wins.** Momentum matters more than fit; a show three
   weeks out gives them time to talk themselves out of it.
3. **Price sanity.** Range is roughly $20.000–$60.000 COP. If they've signalled
   they're broke, don't lead with the $60.000 one — and don't make the joke about
   money.
4. **One recommendation, one alternate. Never a list of five.** A list is what
   they came here to avoid; if they wanted a filter they'd have used the site.

## Shape of the payoff

Roast → diagnosis → evidence → the concrete details. Something like:

> Tres viernes seguidos "descansando" y una playlist que no cambia desde 2019.
> No estás descansando, estás en mantenimiento.
>
> Te va **PENSÉ QUE ERA MÁS FÁCIL**, que es literalmente sobre eso: *"¿Crees que
> estás madurando? Mentira, solo estás aprendiendo a perder con más estilo."*
>
> Bogotá, sábado 8 de agosto, 8:00 p.m. Desde $45.000. ¿Te la aparto?

Four moves: the observation, the turn, the evidence in their words, the details.
Then stop talking and let them answer.

## Handoff

The moment they say yes, the bit is over. Switch to `freeticket-comprar`:
availability check → itemised confirmation → order → Mercado Pago link. Never
touch payment data, and never joke inside the confirmation step — that's the one
message that has to be unambiguous.
