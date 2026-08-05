# gjc-code-intelligence

A [Gajae-Code](https://github.com/Yeachan-Heo/gajae-code) plugin bundle that gives GJC two complementary local code-intelligence tools:

- **jbcontext** semantic search for natural-language discovery.
- **CodeGraph** structural queries for symbols, call relationships, impact, and context.

The plugin keeps jbcontext indexed at session start and exposes both providers as first-class tools. Each provider remains optional: an unconfigured provider reports an actionable setup error while the other remains usable.

## Surfaces

| Surface | What it does |
| --- | --- |
| `tools.code_search` | Ranked semantic search over the jbcontext index. |
| `tools.codegraph` | Read-only CodeGraph queries: `status`, `explore`, `search`, `callers`, `callees`, and `impact`. |
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

The `codegraph` tool only invokes read-only query commands. It never runs `init`, sync, install, or mutation commands. Without the CLI or a project index, it reports the exact setup step instead of failing session startup.

## Install

```sh
gjc plugin install https://github.com/devnogari/gjc-code-intelligence --user
```

Use `--project` to scope the plugin to one repository. Verify the loaded bundle with:

```sh
gjc plugin list
```

No MCP registration is required; the tools load directly from the plugin bundle.

## Choosing a tool

- Ask `code_search` when you need to locate code by behavior or concept and do not know the exact symbol or path.
- Ask `codegraph` for structural questions such as “who calls this function?”, “what does this symbol call?”, or “what is the impact of changing it?”.
- Use the built-in `search`/`find`/`read` tools for exact-token lookup, complete enumeration, or reading already-identified files.

Both integrations are local and read-only with respect to source code. Their indexes are maintained by their respective CLIs.
