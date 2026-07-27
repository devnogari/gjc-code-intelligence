/**
 * Semantic code search over the jbcontext index, exposed as an always-on GJC
 * plugin tool rather than an MCP server.
 *
 * Why a custom tool instead of `mcps` in the manifest:
 *
 * The base system prompt's <exploration> and <tool-priority> blocks map code
 * exploration onto `search`/`find`/`read` and are rendered above any plugin
 * appendix, which is explicitly lower-authority. A plugin appendix therefore
 * cannot change which tool the model reaches for first — measured across
 * appendix, user AGENTS.md, and maximally forceful wording, the first call was
 * always `search` or `find`. A tool description sits in the tool list, at the
 * point of the call decision, which is the only place that competes.
 *
 * It also sidesteps the `--mcp-config` exclusivity: plugin MCP servers are
 * skipped entirely when a session passes an explicit config, but plugin tools
 * load either way.
 */

const BINARY = `${process.env.HOME}/.jbcontext/bin/jbcontext`;
const TIMEOUT_MS = 60_000;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
/** Context lines shown around each hit; the raw chunk is often ~40 lines. */
const SNIPPET_LINES = 14;

interface JbcontextHit {
	result?: {
		scoredText?: { similarity?: number };
		sourcePosition?: { relativePath?: string; startOffset?: number; endOffset?: number };
	};
	content?: string;
}

const factory = (pi: {
	cwd: string;
	zod: typeof import("zod/v4");
	exec: (
		command: string,
		args: string[],
		options?: { cwd?: string; signal?: AbortSignal; timeout?: number },
	) => Promise<{ stdout: string; stderr: string; code: number }>;
}) => {
	const z = pi.zod;

	const parameters = z
		.object({
			query: z
				.string()
				.min(1)
				.describe(
					"What the code does, as a natural-language phrase — 'where the session decides which messages to drop during compaction'. One concept per call. Bare keywords ('compaction', 'error') return noise.",
				),
			pathFilter: z
				.string()
				.optional()
				.describe("Repo-relative path prefix to scope the search to one module, e.g. 'src/runtime-mcp'."),
			limit: z
				.number()
				.int()
				.min(1)
				.max(MAX_LIMIT)
				.optional()
				.describe(`Max results (default ${DEFAULT_LIMIT}).`),
		})
		.strict();

	type Params = import("zod/v4").infer<typeof parameters>;

	/** Byte offset -> 1-indexed line number, so results are directly readable. */
	async function lineAt(relativePath: string, byteOffset: number): Promise<number | null> {
		try {
			const buf = await Bun.file(`${pi.cwd}/${relativePath}`).arrayBuffer();
			const slice = new Uint8Array(buf, 0, Math.min(byteOffset, buf.byteLength));
			let line = 1;
			for (const byte of slice) if (byte === 0x0a) line++;
			return line;
		} catch {
			return null;
		}
	}

	/** Keep the middle of an oversized chunk; the head is usually boilerplate. */
	function trimSnippet(content: string): string {
		const lines = content.split("\n");
		if (lines.length <= SNIPPET_LINES) return content.trimEnd();
		return `${lines.slice(0, SNIPPET_LINES).join("\n").trimEnd()}\n  …`;
	}

	async function render(params: Params, stdout: string): Promise<string> {
		const hits: JbcontextHit[] = [];
		for (const line of stdout.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed?.results)) hits.push(...parsed.results);
			} catch {
				// jbcontext emits one JSON object per line; ignore progress noise.
			}
		}

		if (hits.length === 0) {
			return `No semantic matches for "${params.query}". Rephrase as a fuller description of the behavior, or fall back to \`search\` if you have an exact token.`;
		}

		const blocks: string[] = [];
		for (const hit of hits) {
			const pos = hit.result?.sourcePosition;
			const path = pos?.relativePath;
			if (!path) continue;
			const line = pos.startOffset === undefined ? null : await lineAt(path, pos.startOffset);
			const ref = line === null ? path : `${path}:${line}`;
			const body = hit.content ? trimSnippet(hit.content) : "";
			blocks.push(body ? `${ref}\n${body}` : ref);
		}

		return [
			`${blocks.length} semantic match(es) for "${params.query}":`,
			"",
			blocks.join("\n\n"),
			"",
			"Read the files and lines above before searching further.",
		].join("\n");
	}

	return {
		name: "code_search",
		label: "Code Search",
		description:
			"Semantic code search over this repository, indexed at HEAD. Call this FIRST when you need to locate, explain, investigate, or change code you have not already read in this session — before `search`, `find`, or `read`. Describe what the code does in a natural-language phrase; one call returns ranked files with line numbers and the surrounding source, where a guessed grep pattern would cost several round trips and usually the wrong file. Use `search`/`find` instead only when you already hold an exact token (a symbol from earlier output, a literal string, a path from a stack trace, a config key) or need a complete enumeration of matches — semantic search ranks, it does not enumerate.",
		parameters,
		strict: true,
		async execute(_id: string, params: Params, _onUpdate: unknown, _ctx: unknown, signal?: AbortSignal) {
			const args = [
				"search",
				params.query,
				"--project-path",
				pi.cwd,
				"--limit",
				String(params.limit ?? DEFAULT_LIMIT),
				"--json-output",
			];
			if (params.pathFilter) args.push("--path-filter", params.pathFilter);

			let result: { stdout: string; stderr: string; code: number };
			try {
				result = await pi.exec(BINARY, args, { cwd: pi.cwd, signal, timeout: TIMEOUT_MS });
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (/not found|enoent/i.test(message)) {
					throw new Error(
						"The jbcontext CLI is not installed at ~/.jbcontext/bin/jbcontext. Install it from https://www.jetbrains.com/context/ and run `jbcontext login`.",
					);
				}
				throw error;
			}

			if (result.code !== 0) {
				const stderr = result.stderr.trim();
				if (/not indexed|no index|not authenticated|login/i.test(stderr)) {
					throw new Error(
						`jbcontext cannot search this repository: ${stderr}. Run \`jbcontext login\` and \`jbcontext index --project-path ${pi.cwd}\`.`,
					);
				}
				throw new Error(stderr || "jbcontext search failed with no diagnostic output.");
			}

			return { content: [{ type: "text", text: await render(params, result.stdout) }] };
		},
	};
};

export default factory;
