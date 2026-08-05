/**
 * Read-only CodeGraph integration for structural code questions.
 *
 * CodeGraph owns its local `.codegraph` index; this tool only invokes query
 * commands and never runs init, sync, install, or other mutating operations.
 */

const CLI = "codegraph";
const TIMEOUT_MS = 60_000;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

interface Ref {
	name: string;
	kind: string;
	filePath: string;
	startLine: number;
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
			op: z
				.enum(["explore", "search", "callers", "callees", "impact", "status"])
				.describe("CodeGraph query operation. status needs no target."),
			target: z.string().optional().describe("Natural-language query or symbol name."),
			limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Search result limit."),
			maxFiles: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Maximum files for explore."),
		})
		.strict();
	type Params = import("zod/v4").infer<typeof parameters>;

	function argsFor(params: Params): string[] {
		if (params.op === "status") return ["status", pi.cwd, "--json"];
		const target = params.target?.trim();
		if (!target) throw new Error(`codegraph ${params.op} requires a non-empty "target".`);
		if (params.op === "search") {
			return ["query", target, "--json", "--limit", String(Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)), "--path", pi.cwd];
		}
		if (params.op === "explore") {
			const args = ["explore", target, "--path", pi.cwd];
			if (params.maxFiles !== undefined) args.push("--max-files", String(params.maxFiles));
			return args;
		}
		return [params.op, target, "--json", "--path", pi.cwd];
	}

	function ref(value: Ref): string {
		return `  - ${value.name} (${value.kind}) — ${value.filePath}:${value.startLine}`;
	}

	function render(params: Params, stdout: string): string {
		if (params.op === "explore") return stdout.trim() || `No exploration results for "${params.target?.trim() ?? ""}".`;
		let data: any;
		try {
			data = JSON.parse(stdout);
		} catch {
			throw new Error(`codegraph ${params.op} returned unparseable output.`);
		}
		if (params.op === "search") {
			const hits = data as Array<{ node: any }>;
			if (hits.length === 0) return `No symbols matched "${params.target?.trim() ?? ""}".`;
			return [`${hits.length} symbol(s) matching "${params.target?.trim() ?? ""}":`, ...hits.map(({ node }) => {
				const exported = node.isExported ? " [exported]" : "";
				const signature = node.signature ? ` ${node.signature}` : "";
				return `  - ${node.name} (${node.kind})${signature}${exported} — ${node.filePath}:${node.startLine}`;
			})].join("\n");
		}
		if (params.op === "callers" || params.op === "callees") {
			const key = params.op;
			const list = data[key] ?? [];
			return list.length === 0
				? `No ${key} found for "${data.symbol}".`
				: [`${list.length} ${key} of "${data.symbol}":`, ...list.map(ref)].join("\n");
		}
		if (params.op === "impact") {
			const header = `Impact of changing "${data.symbol}" (depth ${data.depth}): ${data.nodeCount} node(s), ${data.edgeCount} edge(s) affected.`;
			return (data.affected?.length ?? 0) === 0 ? header : [header, "Affected:", ...data.affected.map(ref)].join("\n");
		}
		if (!data.initialized) return `CodeGraph is not initialized for ${data.projectPath}. Run \`codegraph init\`.`;
		const lines = [`CodeGraph index for ${data.projectPath}:`, `  files: ${data.fileCount}, nodes: ${data.nodeCount}, edges: ${data.edgeCount}`];
		if (data.languages?.length) lines.push(`  languages: ${data.languages.join(", ")}`);
		const pending = data.pendingChanges;
		if (pending && (pending.added || pending.modified || pending.removed)) lines.push(`  pending sync: +${pending.added} ~${pending.modified} -${pending.removed}`);
		return lines.join("\n");
	}

	return {
		name: "codegraph",
		label: "CodeGraph",
		description: "Read-only structural code intelligence via the local CodeGraph CLI. Use for symbols, callers, callees, impact, and contextual exploration; requires `codegraph init` in the project.",
		parameters,
		strict: true,
		async execute(_id: string, params: Params, _onUpdate: unknown, _ctx: unknown, signal?: AbortSignal) {
			let result: { stdout: string; stderr: string; code: number };
			try {
				result = await pi.exec(CLI, argsFor(params), { cwd: pi.cwd, signal, timeout: TIMEOUT_MS });
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (/not found|enoent/i.test(message)) throw new Error("The `codegraph` CLI is not installed. Install it from https://github.com/colbymchenry/codegraph.");
				throw error;
			}
			if (result.code !== 0) {
				const stderr = result.stderr.trim();
				if (/not initialized|\.codegraph|no index/i.test(stderr)) throw new Error("CodeGraph is not initialized for this project. Run `codegraph init` in the project root.");
				throw new Error(stderr || "codegraph failed with no diagnostic output.");
			}
			return { content: [{ type: "text", text: render(params, result.stdout) }] };
		},
	};
};

export default factory;
