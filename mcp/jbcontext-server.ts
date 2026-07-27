/**
 * stdio bridge to the JetBrains Context MCP server.
 *
 * GJC plugin-bundle MCP policy only allows `node`/`bun` launchers running a
 * bundled script, so the `jbcontext` binary cannot be named directly in the
 * manifest. This script is a transparent pass-through: it spawns
 * `jbcontext mcp` with inherited stdio, so JSON-RPC framing is untouched.
 *
 * The bundle MCP transport runs with `noInheritEnv`, so only PATH/HOME/locale
 * reach this process. HOME is what `jbcontext` needs for its config and token.
 */

import * as os from "node:os";
import * as path from "node:path";

const binary = path.join(os.homedir(), ".jbcontext", "bin", "jbcontext");

if (!(await Bun.file(binary).exists())) {
	process.stderr.write(
		`jbcontext binary not found at ${binary}. Install it from https://www.jetbrains.com/context/ and run \`jbcontext login\`.\n`,
	);
	process.exit(127);
}

const child = Bun.spawn([binary, "mcp"], {
	stdin: "inherit",
	stdout: "inherit",
	stderr: "inherit",
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
	process.on(signal, () => child.kill(signal));
}

process.exit(await child.exited);
