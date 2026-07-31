"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

interface Memory {
	city?: string;
	interests?: string[];
	watching?: string[];
}

const MEM_KEY = "logia:memory";

/** Etiqueta humana por tool, para el chip de "está haciendo algo". */
const TOOL_LABEL: Record<string, string> = {
	buscar_eventos: "buscando en la cartelera",
	ver_disponibilidad: "mirando cuántas quedan",
	link_evento: "trayendo el link",
	recordar: "tomando nota",
};

const STARTERS = [
	"Roastéame y dime qué show me merezco",
	"¿Qué hay en Bogotá este fin de semana?",
	"Dale, te la devuelvo — modo batalla",
];

export default function Page() {
	const [input, setInput] = useState("");
	const [memory, setMemory] = useState<Memory>({});
	const memRef = useRef<Memory>({});
	const bottom = useRef<HTMLDivElement>(null);

	// La memoria vive en el navegador. El servidor es stateless: no guarda nada
	// de nadie, y se borra sola si la persona limpia el sitio.
	useEffect(() => {
		try {
			const raw = localStorage.getItem(MEM_KEY);
			if (raw) {
				const m = JSON.parse(raw) as Memory;
				setMemory(m);
				memRef.current = m;
			}
		} catch {
			/* storage bloqueado: seguimos sin memoria */
		}
	}, []);

	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: "/api/chat",
			prepareSendMessagesRequest: ({ messages }) => ({
				body: { messages, memory: memRef.current },
			}),
		}),
	});

	// Absorbe lo que el agente decidió recordar.
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
		bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [messages]);

	const busy = status === "submitted" || status === "streaming";

	function send(text: string) {
		if (!text.trim() || busy) return;
		sendMessage({ text });
		setInput("");
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

			<header>
				<h1>
					La Log<i>IA</i>
				</h1>
				<span className="tag">roast primero, entrada después</span>
				{chips.length > 0 && (
					<div className="mem" aria-label="Lo que recuerdo de ti">
						{chips.slice(0, 4).map((c) => (
							<span className="chip" key={c}>
								{c}
							</span>
						))}
					</div>
				)}
			</header>

			<div className="thread">
				{messages.length === 0 && (
					<div className="empty">
						<p>
							LA LOGIA es un formato de roast que FreeTicket trae a Colombia:{" "}
							<em>el homenaje a través del bullying</em>. Los comediantes se
							roastean <em>después de ver el material del otro</em>.
						</p>
						<p style={{ marginTop: 10 }}>
							Yo hago lo mismo: te veo el material, te pego, y de ahí sale qué
							show te sirve — de la cartelera real, con su link.
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
						<span className="who">{m.role === "user" ? "Tú" : "La LogIA"}</span>
						{m.parts.map((part, i) => {
							if (part.type === "text")
								return (
									<div className="bubble" key={`${m.id}-${i}`}>
										{part.text}
									</div>
								);
							if (part.type.startsWith("tool-")) {
								const name = part.type.slice(5);
								return (
									<span className="toolchip" key={`${m.id}-${i}`}>
										{TOOL_LABEL[name] ?? name}
									</span>
								);
							}
							return null;
						})}
					</div>
				))}

				{busy && (
					<div className="msg">
						<span className="who">La LogIA</span>
						<span className="toolchip">pensando la línea</span>
					</div>
				)}
				<div ref={bottom} />
			</div>

			<form
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
				<button className="send" type="submit" disabled={busy || !input.trim()}>
					Enviar
				</button>
			</form>

			<footer>
				Demo no oficial, hecho contra el{" "}
				<a
					href="https://appfreeticket.com/api/public/openapi.json"
					target="_blank"
					rel="noopener noreferrer"
				>
					contrato público
				</a>{" "}
				de FreeTicket. La cartelera es real; el pago se hace en la página del
				evento y este agente nunca pide datos de tarjeta. Lo que recuerda vive en
				tu navegador, no en el servidor.
			</footer>
		</div>
	);
}
