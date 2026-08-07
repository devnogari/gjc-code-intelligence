# gjc-code-intelligence

A [Gajae-Code](https://github.com/Yeachan-Heo/gajae-code) plugin bundle that gives GJC two complementary local code-intelligence tools:

- **jbcontext** semantic search for natural-language discovery.
- **CodeGraph** structural queries for symbols, call relationships, impact, and context.

The plugin keeps jbcontext indexed at session start and exposes both providers as first-class tools. Each provider remains optional: an unconfigured provider reports an actionable setup error while the other remains usable.

## Surfaces

| Surface | What it does |
| --- | --- |
| `tools.code_search` | Ranked semantic search over the jbcontext index. |
| `tools.codegraph` | Read-only CodeGraph queries for `explore`, `node`, `query`, `files`, relationships, `impact`, `affected`, and `status`. |
| `hooks.auto-index` | Re-indexes jbcontext on session start when the CLI is available. |
| `system_appendix` | Explains when semantic and structural search beat literal file search. |

## Requirements

### jbcontext

Install and authenticate [JetBrains Context](https://www.jetbrains.com/context/):

```sh
jbcontext login
```

The hook and `code_search` tool use `~/.jbcontext/bin/jbcontext`. If it is missing or the repository is not indexed, GJC falls back to its normal search tools with an actionable diagnostic.

### CodeGraph

Install [CodeGraph](https://github.com/colbymchenry/codegraph) and initialize the current project:

```sh
npm i -g @colbymchenry/codegraph
cd your-project
codegraph init
```

The `codegraph` tool only invokes read-only query commands. It never runs `init`, sync, install, or mutation commands. Without the CLI or a project index, it reports the exact setup step instead of failing session startup. The session-start hook starts a project-scoped CodeGraph watcher with `codegraph serve --mcp --path <cwd>` when `.codegraph` exists; MCP client registration is not required for that watcher.

## Install

```sh
gjc plugin install https://github.com/devnogari/gjc-code-intelligence --user
```

Use `--project` to scope the plugin to one repository. Verify the loaded bundle with:

```sh
gjc plugin list
```

No MCP registration is required; the tools load directly from the plugin bundle.

## Migration

Delete the superseded standalone hook `~/.gjc/agent/hooks/jbcontext-index.ts` when installing this plugin. `hooks/auto-index.ts` replaces it. The old hook `await`s `jbcontext index` inside `session_start`, which runs inside GJC's 10s SDK lifecycle readiness window; with measured index times of 16.7s-39.7s it hard-fails session creation with `No ready SDK endpoint remains available.`

## Choosing a tool

- Ask `code_search` when you need to locate code by behavior or concept and do not know the exact symbol or path.
- Ask `codegraph` for structural questions: use `explore` for architecture and flows, `node` for a symbol/file's source and nearby relationships, and `callers`/`callees` for focused edges.
- Use `impact` to estimate symbol blast radius and `affected` to identify tests affected by changed files; use `files` and `status` to inspect indexed project coverage.
- Use the built-in `search`/`find`/`read` tools for exact-token lookup, complete enumeration, or reading already-identified files.
- Use `codegraph` first for unfamiliar or exploratory questions; call `explore` before reading files or delegating exploration.
- Use `node`, `callers`, `callees`, `impact`, `affected`, `files`, and `status` for focused structural context.
- Use `code_search` for behavior discovery when the structure or symbol is unknown.
- Use built-in `search`/`find`/`read` for exact tokens or already-identified paths, not as a substitute for CodeGraph.

Both integrations are local and read-only with respect to source code. Their indexes are maintained by their respective CLIs.
