import { skillIndex } from "@/lib/skills";

/** `GET /api/skill` — índice. El contenido crudo va en `/api/skill/<name>`. */
export const dynamic = "force-static";

export function GET() {
	const base = "https://la-logia-theta.vercel.app";
	return Response.json(
		{
			protocol: `${base}/api/agents`,
			skills: skillIndex().map((s) => ({
				name: s.name,
				summary: s.summary,
				raw: `${base}/api/skill/${s.name}`,
				install: `curl -s ${base}/api/skill/${s.name} -o .claude/skills/${s.name}/SKILL.md`,
			})),
		},
		{ headers: { "cache-control": "public, max-age=300" } },
	);
}
