import { SKILLS, readSkill } from "@/lib/skills";

/** `GET /api/skill/<name>` — el SKILL.md crudo, listo para `curl -o`. */
export const dynamic = "force-static";

export function generateStaticParams() {
	return SKILLS.map((s) => ({ name: s.name }));
}

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ name: string }> },
) {
	const { name } = await params;
	const md = readSkill(name);

	if (!md) {
		return new Response(
			`No existe la skill "${name}".\n\nDisponibles:\n${SKILLS.map((s) => `  ${s.name}`).join("\n")}\n`,
			{ status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
		);
	}

	return new Response(md, {
		headers: {
			"content-type": "text/markdown; charset=utf-8",
			"cache-control": "public, max-age=300",
			"content-disposition": `inline; filename="${name}-SKILL.md"`,
		},
	});
}
