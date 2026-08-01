import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `/api/skill/<name>` lee los SKILL.md de disco: hay que incluirlos en el
  // trace o no existen en la función desplegada.
  outputFileTracingIncludes: {
    "/api/skill/**": ["./skills/**/*.md"],
    "/api/agents": ["./skills/**/*.md"],
  },
};

export default nextConfig;
