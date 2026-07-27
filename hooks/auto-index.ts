/**
 * Keep the jbcontext index fresh for the session's repository.
 *
 * `jbcontext setup-agent` supports claude/codex/intellij/junie/generic but not
 * GJC, so the SessionStart indexing hook those agents get has no equivalent
 * here. Without it, `mcp__jbcontext_code_search` answers from whatever revision
 * happened to be indexed last instead of the current HEAD.
 *
 * The index runs detached: it takes ~15s on a mid-size repo, which must not
 * block session start, and must outlive short-lived `gjc -p` runs.
 */

import * as os from "node:os";
import * as path from "node:path";

const BINARY = path.join(os.homedir(), ".jbcontext", "bin", "jbcontext");

/** Projects already indexed in this process, keyed by cwd. */
const indexed = new Set<string>();

async function indexProject(cwd: string): Promise<void> {
	if (indexed.has(cwd)) return;
	indexed.add(cwd);

	if (!(await Bun.file(BINARY).exists())) return;

	const git = Bun.spawn(["git", "rev-parse", "--git-dir"], {
		cwd,
		stdin: "ignore",
		stdout: "ignore",
		stderr: "ignore",
	});
	if ((await git.exited) !== 0) return;

	const child = Bun.spawn([BINARY, "index", "--silent", "--project-path", cwd], {
		cwd,
		stdin: "ignore",
		stdout: "ignore",
		stderr: "ignore",
	});
	child.unref();
}

export default function jbcontextAutoIndex(api: {
	on: (event: string, handler: (event: unknown, ctx: { cwd: string }) => void) => void;
	logger: { warn: (message: string) => void };
}): void {
	api.on("session_start", (_event, ctx) => {
		void indexProject(ctx.cwd).catch(error => {
			api.logger.warn(`jbcontext auto-index failed: ${error instanceof Error ? error.message : String(error)}`);
		});
	});
}
