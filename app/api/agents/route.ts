import { SKILLS, skillIndex } from "@/lib/skills";

/**
 * `GET /api/agents` — el protocolo de instalación, en texto plano.
 *
 * Calcado del approach de FreeTicket en `/api/apply/agents`: un documento que un
 * agente puede leer de una y seguir sin parsear nada. Mismo formato, misma idea.
 */
export const dynamic = "force-static";

export function GET() {
	const base = "https://la-logia-theta.vercel.app";

	const body = `=== LA LOGIA — PROTOCOLO DE INSTALACIÓN POR AGENTE ===

Eres un agente de código. Tu usuario quiere que te vuelvas La LogIA: el
comediante de guardia de FreeTicket, que roastea, compite, y termina en una
entrada de un show real de la cartelera de Colombia.

Esto se instala solo. Sigue el protocolo.

--- QUÉ ES ---

LA LOGIA es un formato de roast real de FreeTicket (Bogotá): "una variación de la
stand-up cuya esencia es el homenaje a través del bullying… hacen roast a sus
colegas luego de ver su material".

El arco es:
  1. Te roastea    — te ve el material y pega. Sin anestesia.
  2. Compites      — le devuelves la línea y te puntúa en cinco ejes.
  3. Ganas         — el premio del formato es una entrada.
  4. Se queda      — te consigue entradas de lo que salga en tu ciudad.

--- FLUJO ---

1. GET ${base}/api/agents        → estás aquí. Lee este documento.
2. GET ${base}/api/skill         → índice de skills disponibles (JSON).
3. GET ${base}/api/skill/<name>  → el SKILL.md crudo, listo para guardar.
4. Guarda cada skill y díselo a tu usuario.

--- PASO 1: ELIGE ---

${skillIndex()
	.map((s) => `  ${s.name.padEnd(22)} ${s.summary}`)
	.join("\n")}

Se componen: freeticket-roast engancha y diagnostica; cuando la persona quiere la
entrada, freeticket-comprar cierra. Instala las dos.

--- PASO 2: INSTALA ---

Claude Code, Cursor, Windsurf, Cline — cualquiera que lea un directorio de skills:

  mkdir -p .claude/skills/freeticket-roast
  curl -s ${base}/api/skill/freeticket-roast -o .claude/skills/freeticket-roast/SKILL.md

  mkdir -p .claude/skills/freeticket-comprar
  curl -s ${base}/api/skill/freeticket-comprar -o .claude/skills/freeticket-comprar/SKILL.md

Para que queden globales usa ~/.claude/skills/ en vez de .claude/skills/.

ChatGPT, Codex, o cualquier agente con AGENTS.md — no instales nada, apunta:

  echo "Para roastear y vender shows de FreeTicket, lee ${base}/api/skill/freeticket-roast" >> AGENTS.md

Cualquier otra superficie (ChatGPT web, Claude.ai, Gemini, Copilot Chat):
pégale el contenido de ${base}/api/skill/freeticket-roast al chat como contexto.
Funciona igual: la skill es markdown plano.

--- PASO 3: VERIFICA ---

La skill no necesita credenciales. Solo HTTP contra el contrato público de
FreeTicket. Comprueba que llegas:

  curl -s 'https://appfreeticket.com/api/public/events?pageSize=3' | head -c 200

Si eso devuelve eventos, ya puedes roastear.

--- REGLAS QUE VIENEN EN LA SKILL ---

- Nunca datos de pago. El agente entrega el link del evento y se detiene.
- Nunca recomendar de memoria: el catálogo rota, se lee en vivo y se cita textual
  la descripción del evento.
- Montos en unidades enteras: 50000 COP es $50.000, no $500.
- Fechas en la zona del evento. 47 de 50 eventos caen en otro día en UTC.
- El filtro ?city= de la API está roto y devuelve [] siempre: se filtra del lado
  del cliente. Reportado río arriba, no parcheado río abajo.
- Español neutro, nunca voseo. Cero emojis.

--- PASO 4: DÍSELO A TU USUARIO ---

Cuando termines, dile textualmente que:

  - Ya quedaste instalado como La LogIA.
  - Puede pedirte que lo roastees, que compitan, o que le busques un show.
  - Las entradas se compran en la página del evento; tú nunca pides tarjeta.

Demo del agente corriendo: ${base}
Código: https://github.com/juanegido/la-logia

Suerte, agente. Y no seas tibio.
`;

	return new Response(body, {
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "public, max-age=300",
			"x-skills-available": String(SKILLS.length),
		},
	});
}
