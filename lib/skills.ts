import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lee las skills de `skills/` en disco.
 *
 * Son la fuente de verdad: `lib/prompt.ts` es su encarnación en el demo, y
 * `/api/skill/<name>` sirve el mismo archivo para que cualquier agente se lo
 * instale. Un solo original, tres consumidores.
 *
 * `next.config.ts` incluye `skills/**` en el trace de salida para que los
 * archivos existan en la función desplegada.
 */

export interface SkillMeta {
	name: string;
	summary: string;
	file: string;
}

export const SKILLS: SkillMeta[] = [
	{
		name: "freeticket-roast",
		summary: "El personaje: te ve el material, pega, y de ahí sale el show.",
		file: "skills/freeticket-roast/SKILL.md",
	},
	{
		name: "freeticket-roast-personas",
		summary: "El roster: contra quién peleas y de dónde sale cada estilo.",
		file: "skills/freeticket-roast/references/personas.md",
	},
	{
		name: "freeticket-roast-material",
		summary: "Cómo traer material del entorno del usuario, con permiso y sin que salga de su máquina.",
		file: "skills/freeticket-roast/references/material.md",
	},
	{
		name: "freeticket-comprar",
		summary: "El cierre: cartelera, stock en vivo y link de pago.",
		file: "skills/freeticket-comprar/SKILL.md",
	},
];

export function skillIndex(): SkillMeta[] {
	return SKILLS;
}

export function readSkill(name: string): string | null {
	const meta = SKILLS.find((s) => s.name === name);
	if (!meta) return null;
	try {
		return readFileSync(join(process.cwd(), meta.file), "utf8");
	} catch {
		return null;
	}
}
