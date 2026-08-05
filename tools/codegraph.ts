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
const MAX_DEPTH = 20;

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
				.enum(["explore", "search", "node", "files", "callers", "callees", "impact", "affected", "status"])
				.describe("CodeGraph query operation. status and files need no target; affected accepts file paths."),
			target: z.string().optional().describe("Natural-language query, symbol name, or affected file path(s)."),
			files: z.array(z.string().min(1)).min(1).optional().describe("Changed files for affected; overrides target when provided."),
			limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Search, callers, callees, or node file line limit."),
			kind: z.string().min(1).optional().describe("Query kind filter, such as function or class."),
			depth: z.number().int().min(1).max(MAX_DEPTH).optional().describe("Traversal depth for impact or affected."),
			maxFiles: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Maximum files for explore."),
			file: z.string().min(1).optional().describe("Disambiguate node lookup to a file."),
			offset: z.number().int().min(1).optional().describe("Node file mode starting line."),
			symbolsOnly: z.boolean().optional().describe("Node file mode: return only symbols and dependents."),
			filter: z.string().min(1).optional().describe("Files directory filter or affected test glob."),
			pattern: z.string().min(1).optional().describe("Files glob pattern."),
			format: z.enum(["tree", "flat", "grouped"]).optional().describe("Files output format."),
			maxDepth: z.number().int().min(1).max(MAX_DEPTH).optional().describe("Files tree depth."),
		})
		.strict();
	type Params = import("zod/v4").infer<typeof parameters>;

	function bounded(value: number | undefined, fallback: number, max: number): number {
		return Math.min(value ?? fallback, max);
	}

	function affectedFiles(params: Params): string[] {
		if (params.files?.length) return params.files;
		const target = params.target?.trim();
		if (!target) throw new Error("codegraph affected requires target or files.");
		return target.split(/[\n,]+/).map((file) => file.trim()).filter(Boolean);
	}

	function argsFor(params: Params): string[] {
		if (params.op === "status") return ["status", pi.cwd, "--json"];
		if (params.op === "files") {
			const args = ["files", "--json", "--path", pi.cwd];
			if (params.filter) args.push("--filter", params.filter);
			if (params.pattern) args.push("--pattern", params.pattern);
			if (params.format) args.push("--format", params.format);
			if (params.maxDepth !== undefined) args.push("--max-depth", String(params.maxDepth));
			return args;
		}
		if (params.op === "affected") {
			const args = ["affected", ...affectedFiles(params), "--json", "--path", pi.cwd];
			if (params.depth !== undefined) args.push("--depth", String(params.depth));
			if (params.filter) args.push("--filter", params.filter);
			return args;
		}
		const target = params.target?.trim();
		if (!target) throw new Error(`codegraph ${params.op} requires a non-empty "target".`);
		if (params.op === "search") {
			const args = ["query", target, "--json", "--limit", String(bounded(params.limit, DEFAULT_LIMIT, MAX_LIMIT)), "--path", pi.cwd];
			if (params.kind) args.push("--kind", params.kind);
			return args;
		}
		if (params.op === "explore") {
			const args = ["explore", target, "--path", pi.cwd];
			if (params.maxFiles !== undefined) args.push("--max-files", String(params.maxFiles));
			return args;
		}
		if (params.op === "node") {
			const args = ["node", target, "--path", pi.cwd];
			if (params.file) args.push("--file", params.file);
			if (params.offset !== undefined) args.push("--offset", String(params.offset));
			if (params.limit !== undefined) args.push("--limit", String(params.limit));
			if (params.symbolsOnly) args.push("--symbols-only");
			return args;
		}
		const args = [params.op, target, "--json", "--path", pi.cwd];
		if (params.op === "callers" || params.op === "callees") args.splice(2, 0, "--limit", String(bounded(params.limit, DEFAULT_LIMIT, MAX_LIMIT)));
		if (params.op === "impact" && params.depth !== undefined) args.splice(2, 0, "--depth", String(params.depth));
		return args;
	}

	function ref(value: Ref): string {
		return `  - ${value.name} (${value.kind}) — ${value.filePath}:${value.startLine}`;
	}

	function render(params: Params, stdout: string): string {
		if (params.op === "explore" || params.op === "node") return stdout.trim() || `No results for "${params.target?.trim() ?? ""}".`;
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
			const list = data[params.op] ?? [];
			return list.length === 0 ? `No ${params.op} found for "${data.symbol}".` : [`${list.length} ${params.op} of "${data.symbol}":`, ...list.map(ref)].join("\n");
		}
		if (params.op === "impact") {
			const header = `Impact of changing "${data.symbol}" (depth ${data.depth}): ${data.nodeCount} node(s), ${data.edgeCount} edge(s) affected.`;
			return (data.affected?.length ?? 0) === 0 ? header : [header, "Affected:", ...data.affected.map(ref)].join("\n");
		}
		if (params.op === "affected") {
			const files = data.affectedTests ?? data.files ?? [];
			return files.length === 0 ? "No affected test files found." : [`${files.length} affected test file(s):`, ...files.map((file: string) => `  - ${file}`)].join("\n");
		}
		if (params.op === "files") return stdout.trim() || "No indexed files found.";
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
		description: "Read-only structural code intelligence via the local CodeGraph CLI. Use explore for architecture, node for exact symbol/file context, callers/callees for relationships, impact/affected for change scope, and files/status for index context.",
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
