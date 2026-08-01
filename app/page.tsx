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
		title: "Eliges rival",
		body: (
			<>
				La LogIA, o uno de nuestros roasters. Cada uno pega con su propio
				estilo.
			</>
		),
		note: "8 comediantes",
	},
	{
		title: "Te roastea",
		body: <>Te ve el material y pega. Sin avisar y sin suavizarlo después.</>,
	},
	{
		title: "Compites",
		body: (
			<>
				Se la devuelves y te puntúa: especificidad, giro, economía, callback y{" "}
				<b>daño</b>.
			</>
		),
		note: "Máximo 3 rondas",
	},
	{
		title: "Te ganas una entrada",
		body: (
			<>
				El premio del formato. Acá corre en <b>exhibición</b>: se puntúa de
				verdad, no se reparten entradas.
			</>
		),
	},
	{
		title: "Y se queda",
		body: (
			<>
				Te busca entradas de lo que salga en tu ciudad y te avisa cuando vuelva
				lo que te gustó.
			</>
		),
	},
];

const ONELINER = `Lee ${BASE}/api/prompt y compórtate exactamente como dice ese documento.`;

export default function Page() {
	const [input, setInput] = useState("");
	const [memory, setMemory] = useState<Memory>({});
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


	function send(text: string) {
		if (!text.trim() || busy) return;
		sendMessage({ text });
		setInput("");
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(ONELINER);
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
						Cada estilo sale de la descripción de su propio show en la
						cartelera, con permiso del comediante — y cada uno cierra
						vendiéndote su próxima fecha.
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
					Pega esta línea en ChatGPT. Él se lee las instrucciones y se convierte
					en La LogIA — con una ventaja que este sitio no tiene:{" "}
					<b>ya sabe cosas de ti</b>. Te pide permiso una vez y las usa en tu
					contra.
				</p>

				<div className="oneliner">
					<code>{ONELINER}</code>
					<button type="button" className="copy" onClick={copy}>
						{copied ? "Copiado" : "Copiar"}
					</button>
				</div>

				<p className="paths">
					<b>Claude o Gemini:</b> la misma línea, igual.
					<br />
					<b>Agentes de código:</b>{" "}
					<a href="/api/agents" target="_blank" rel="noopener noreferrer">
						<code>curl -s {BASE}/api/agents</code>
					</a>{" "}
					trae el protocolo de instalación.
				</p>
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
