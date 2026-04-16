/**
 * IMPORTANT: Keep this file.
 *
 * This guard enforces Bun as the only package manager for this repository.
 * It blocks npm/yarn/pnpm installs to avoid lockfile drift, inconsistent
 * dependency trees, and "works on my machine" setup issues across the team.
 *
 * If you remove this file (or the preinstall hook), contributors may install
 * dependencies with different package managers and break reproducibility.
 */
const userAgent = process.env.npm_config_user_agent || "";
const execPath = (process.env.npm_execpath || "").toLowerCase();
const bunUA = userAgent.startsWith("bun/");

const npmFamilyUA = /(^|\s)(npm|yarn|pnpm)\//.test(userAgent) && !bunUA;
const npmFamilyExec =
  /(npm|yarn|pnpm)/.test(execPath) && !execPath.includes("bun");
const runningOnBun = Boolean(process.versions?.bun);

if (npmFamilyUA || npmFamilyExec || !runningOnBun) {
  console.error("\nEste proyecto esta configurado para usar solo Bun.");
  console.error("Usa: bun install\n");
  process.exit(1);
}
