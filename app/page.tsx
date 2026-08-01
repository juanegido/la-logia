"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

import { PERSONAS } from "@/lib/personas";

interface Memory {
	city?: string;
	interests?: string[];
	watching?: string[];
}

const MEM_KEY = "logia:memory";
const BASE = "https://la-logia-theta.vercel.app";

const TOOL_LABEL: Record<string, string> = {
	buscar_eventos: "buscando en la cartelera",
	ver_disponibilidad: "mirando cuántas quedan",
	link_evento: "trayendo el link",
	recordar: "tomando nota",
};

const STARTERS = [
	"Roastéame, sin anestesia",
	"¿Qué hay en Bogotá este fin de semana?",
	"Te la devuelvo — modo batalla",
];

const ACTS = [
	{
		title: "Te roasteo",
		body: (
			<>
				Primero te veo el material — un par de preguntas — y de ahí pego.{" "}
				<b>Sin avisar y sin suavizarlo después.</b> Así es el formato.
			</>
		),
	},
	{
		title: "Compites",
		body: (
			<>
				Me la devuelves y te puntúo en cinco ejes: especificidad, giro,
				economía, callback y <b>daño</b>. Pegarle a algo que la otra persona no
				eligió puntúa cero — no por moral, por pereza.
			</>
		),
		note: "Máximo 3 rondas",
	},
	{
		title: "Te ganas una entrada",
		body: (
			<>
				Es el premio del formato completo. Acá corre en <b>exhibición</b>:
				puntúo de verdad, pero no reparto entradas — eso necesita credenciales
				del organizador.
			</>
		),
	},
	{
		title: "Y me quedo",
		body: (
			<>
				Ganes o no. Te busco entradas de lo que salga en tu ciudad y te aviso
				cuando vuelva lo que te gustó. <b>Eso es lo que de verdad vale.</b>
			</>
		),
	},
];

const INSTALLS = [
	{
		id: "claude",
		label: "Claude Code",
		hint: "También sirve en Cursor, Windsurf y Cline. Usa ~/.claude/skills para dejarlo global.",
		code: `mkdir -p .claude/skills/freeticket-roast
curl -s ${BASE}/api/skill/freeticket-roast \\
  -o .claude/skills/freeticket-roast/SKILL.md`,
	},
	{
		id: "chatgpt",
		label: "ChatGPT / Codex",
		hint: "Sin instalar nada: se apunta desde tu AGENTS.md y el agente lo lee cuando hace falta.",
		code: `echo "Para roastear y vender shows de FreeTicket, lee \\
${BASE}/api/skill/freeticket-roast" >> AGENTS.md`,
	},
	{
		id: "agente",
		label: "Que lo haga tu agente",
		hint: "Un documento en texto plano con el protocolo completo, igual que hace FreeTicket en /api/apply/agents.",
		code: `curl -s ${BASE}/api/agents`,
	},
];

export default function Page() {
	const [input, setInput] = useState("");
	const [memory, setMemory] = useState<Memory>({});
	const [tab, setTab] = useState(INSTALLS[0].id);
	const [persona, setPersona] = useState("libre");
	const personaRef = useRef("libre");
	const [copied, setCopied] = useState(false);
	const memRef = useRef<Memory>({});
	const bottom = useRef<HTMLDivElement>(null);

	// La memoria vive en el navegador. El servidor no guarda nada de nadie.
	useEffect(() => {
		try {
			const raw = localStorage.getItem(MEM_KEY);
			if (raw) {
				const m = JSON.parse(raw) as Memory;
				setMemory(m);
				memRef.current = m;
			}
		} catch {
			/* storage bloqueado */
		}
	}, []);

	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: "/api/chat",
			prepareSendMessagesRequest: ({ messages }) => ({
				body: {
					messages,
					memory: memRef.current,
					persona: personaRef.current,
				},
			}),
		}),
	});

	useEffect(() => {
		const patch: Memory = {};
		for (const m of messages) {
			for (const part of m.parts as { type: string; output?: unknown }[]) {
				if (part.type !== "tool-recordar" || !part.output) continue;
				const o = part.output as {
					city?: string;
					interest?: string;
					watching?: string;
				};
				if (o.city) patch.city = o.city;
				if (o.interest)
					patch.interests = [
						...new Set([...(memRef.current.interests ?? []), o.interest]),
					];
				if (o.watching)
					patch.watching = [
						...new Set([...(memRef.current.watching ?? []), o.watching]),
					];
			}
		}
		if (!Object.keys(patch).length) return;
		const next = { ...memRef.current, ...patch };
		if (JSON.stringify(next) === JSON.stringify(memRef.current)) return;
		memRef.current = next;
		setMemory(next);
		try {
			localStorage.setItem(MEM_KEY, JSON.stringify(next));
		} catch {
			/* noop */
		}
	}, [messages]);

	useEffect(() => {
		if (messages.length) bottom.current?.scrollIntoView({ block: "end" });
	}, [messages]);

	const busy = status === "submitted" || status === "streaming";
	const active = INSTALLS.find((i) => i.id === tab) ?? INSTALLS[0];

	function send(text: string) {
		if (!text.trim() || busy) return;
		sendMessage({ text });
		setInput("");
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(active.code.replace(/\\\n\s*/g, ""));
			setCopied(true);
			setTimeout(() => setCopied(false), 1600);
		} catch {
			/* sin permiso de portapapeles */
		}
	}

	const chips = [
		memory.city,
		...(memory.interests ?? []),
		...(memory.watching ?? []),
	].filter(Boolean) as string[];

	return (
		<div className="shell">
			<span className="orb orb-1" aria-hidden />
			<span className="orb orb-2" aria-hidden />

			<section className="poster">
				<div className="billing">
					<span className="live">En vivo</span>
					<span className="dot" />
					<span>Bogotá</span>
					<span className="dot" />
					<span>Roast</span>
					<span className="dot" />
					<span>18+</span>
				</div>

				<h1 className="wordmark">
					La Log<i>IA</i>
				</h1>

				<p className="kicker">
					LA LOGIA es un formato de roast que FreeTicket trae a Colombia:{" "}
					<em>el homenaje a través del bullying</em>. Los comediantes se
					destrozan después de ver el material del otro. Yo hago lo mismo
					contigo, y de ahí sale a qué show tienes que ir.
				</p>

				<div className="rule" />

				<div className="lineup">
					{ACTS.map((a) => (
						<article className="act" key={a.title}>
							<h3>{a.title}</h3>
							<p>
								{a.body}
								{a.note && <span className="note">{a.note}</span>}
							</p>
						</article>
					))}
				</div>
			</section>

			<section className="stage">
				<div className="stage-bar">
					<span className="mic">Micrófono abierto</span>
					{chips.length > 0 && (
						<div className="mem" aria-label="Lo que recuerdo de ti">
							{chips.slice(0, 4).map((c) => (
								<span className="chip" key={c}>
									{c}
								</span>
							))}
						</div>
					)}
				</div>

				<div className="corner" role="group" aria-label="Contra quién peleas">
					<span className="corner-label">Rival</span>
					<div className="fighters">
						<button
							type="button"
							className="fighter"
							aria-pressed={persona === "libre"}
							onClick={() => {
								setPersona("libre");
								personaRef.current = "libre";
							}}
						>
							La LogIA
						</button>
						{PERSONAS.map((p) => (
							<button
								type="button"
								className="fighter"
								key={p.id}
								aria-pressed={persona === p.id}
								title={`${p.show} — ${p.tag}`}
								onClick={() => {
									setPersona(p.id);
									personaRef.current = p.id;
								}}
							>
								{p.name}
								<em>{p.tag}</em>
							</button>
						))}
					</div>
					<p className="corner-note">
						Imitación declarada, no suplantación. Cada estilo sale de la
						descripción del show de esa persona en la cartelera, y cada uno
						vende el suyo.
					</p>
				</div>

				<div className="thread">
					{messages.length === 0 && (
						<div className="opener">
							<p style={{ margin: 0 }}>
								Dame algo con lo que trabajar. Entre más específico, peor te va.
							</p>
							<div className="starters">
								{STARTERS.map((s) => (
									<button
										type="button"
										className="starter"
										key={s}
										onClick={() => send(s)}
									>
										{s}
									</button>
								))}
							</div>
						</div>
					)}

					{messages.map((m) => (
						<div className={`msg ${m.role === "user" ? "me" : ""}`} key={m.id}>
							<span className="who">
								{m.role === "user" ? "Tú" : "La LogIA"}
							</span>
							{m.parts.map((part, i) => {
								if (part.type === "text")
									return (
										<div className="bubble" key={`${m.id}-${i}`}>
											{part.text}
										</div>
									);
								if (part.type.startsWith("tool-"))
									return (
										<span className="toolchip" key={`${m.id}-${i}`}>
											{TOOL_LABEL[part.type.slice(5)] ?? part.type.slice(5)}
										</span>
									);
								return null;
							})}
						</div>
					))}

					{busy && (
						<div className="msg">
							<span className="who">La LogIA</span>
							<span className="toolchip">afilando</span>
						</div>
					)}
					<div ref={bottom} />
				</div>

				<form
					className="composer"
					onSubmit={(e) => {
						e.preventDefault();
						send(input);
					}}
				>
					<input
						type="text"
						value={input}
						placeholder="Escribe algo que pueda usar en tu contra…"
						onChange={(e) => setInput(e.currentTarget.value)}
						aria-label="Mensaje"
					/>
					<button type="submit" disabled={busy || !input.trim()}>
						Enviar
					</button>
				</form>
			</section>

			<section className="stub">
				<h2>Llévatelo puesto</h2>
				<p className="lead">
					La LogIA no vive solo acá. Es una skill en markdown plano: se instala
					en tu agente y sigue funcionando en tu terminal, con la misma
					cartelera en vivo y las mismas reglas.
				</p>

				<div className="tabs" role="tablist" aria-label="Dónde instalarlo">
					{INSTALLS.map((i) => (
						<button
							type="button"
							role="tab"
							className="tab"
							key={i.id}
							aria-selected={tab === i.id}
							onClick={() => setTab(i.id)}
						>
							{i.label}
						</button>
					))}
				</div>

				<div className="snippet">
					<p>{active.hint}</p>
					<pre>
						<code>{active.code}</code>
					</pre>
					<button type="button" className="copy" onClick={copy}>
						{copied ? "Copiado" : "Copiar"}
					</button>
				</div>
			</section>

			<footer>
				Demo no oficial, construido solo contra el{" "}
				<a
					href="https://appfreeticket.com/api/public/openapi.json"
					target="_blank"
					rel="noopener noreferrer"
				>
					contrato público
				</a>{" "}
				de FreeTicket. La cartelera, los precios y el stock son reales. El pago
				se cierra en la página del evento: este agente nunca pide datos de
				tarjeta y no crea órdenes. Lo que recuerda de ti vive en tu navegador,
				no en el servidor.
				<br />
				<a
					href="https://github.com/juanegido/la-logia"
					target="_blank"
					rel="noopener noreferrer"
				>
					Código
				</a>{" "}
				·{" "}
				<a href="/api/agents" target="_blank" rel="noopener noreferrer">
					Protocolo para agentes
				</a>{" "}
				·{" "}
				<a
					href="https://github.com/juanegido/freeticket-plugin"
					target="_blank"
					rel="noopener noreferrer"
				>
					Hallazgos y bug report
				</a>
			</footer>
		</div>
	);
}
