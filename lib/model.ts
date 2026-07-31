/**
 * Resolución de modelo por variable de entorno.
 *
 * Pones UNA key en `.env.local` (o en las env vars del proyecto de Vercel) y
 * arranca. Gana la primera que exista, en este orden:
 *
 *   ANTHROPIC_API_KEY            → Claude directo
 *   OPENAI_API_KEY               → GPT directo
 *   GOOGLE_GENERATIVE_AI_API_KEY → Gemini directo
 *   AI_GATEWAY_API_KEY           → Vercel AI Gateway
 *
 * El gateway va último a propósito: es la opción más cómoda (una key, cualquier
 * modelo) pero **exige una tarjeta registrada en Vercel** y sin ella responde
 * 403 `customer_verification_required`. Una key directa funciona sin eso.
 *
 * `LOGIA_PROVIDER` fuerza el proveedor y `LOGIA_MODEL` el id del modelo.
 *
 * Ninguna key vive en el repo: `.env.local` está en .gitignore y acá solo hay
 * nombres de variables.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export interface Resolved {
	model: LanguageModel;
	label: string;
}

type Provider = "anthropic" | "openai" | "google" | "gateway";

const ENV: Record<Provider, string> = {
	anthropic: "ANTHROPIC_API_KEY",
	openai: "OPENAI_API_KEY",
	google: "GOOGLE_GENERATIVE_AI_API_KEY",
	gateway: "AI_GATEWAY_API_KEY",
};

const DEFAULT_MODEL: Record<Provider, string> = {
	anthropic: "claude-sonnet-5",
	openai: "gpt-5",
	google: "gemini-2.5-pro",
	gateway: "anthropic/claude-sonnet-5",
};

const ORDER: Provider[] = ["anthropic", "openai", "google", "gateway"];

function build(p: Provider, id: string): Resolved {
	switch (p) {
		case "anthropic":
			return { model: anthropic(id), label: `anthropic:${id}` };
		case "openai":
			return { model: openai(id), label: `openai:${id}` };
		case "google":
			return { model: google(id), label: `google:${id}` };
		case "gateway":
			// El provider del gateway viene incluido en `ai`: un string basta.
			return { model: id, label: `gateway:${id}` };
	}
}

export function resolveModel(): Resolved {
	const forcedProvider = process.env.LOGIA_PROVIDER as Provider | undefined;
	const forcedModel = process.env.LOGIA_MODEL;

	const candidates = forcedProvider ? [forcedProvider] : ORDER;
	for (const p of candidates) {
		if (!process.env[ENV[p]]) continue;
		return build(p, forcedModel ?? DEFAULT_MODEL[p]);
	}

	throw new Error(
		"Falta la credencial del modelo. Copia .env.example a .env.local y pon UNA de: " +
			ORDER.map((p) => ENV[p]).join(", ") +
			".",
	);
}

/** Health check: qué proveedor quedó activo. Nunca expone la key. */
export function modelStatus(): { ready: boolean; provider: string | null } {
	try {
		return { ready: true, provider: resolveModel().label };
	} catch {
		return { ready: false, provider: null };
	}
}
