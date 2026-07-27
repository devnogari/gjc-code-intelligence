# gjc-jbcontext

A [Gajae-Code](https://github.com/Yeachan-Heo/gajae-code) plugin bundle that wires
[JetBrains Context](https://www.jetbrains.com/context/) (`jbcontext`) semantic code search into GJC.

`jbcontext setup-agent` supports claude/codex/intellij/junie/generic, but not GJC. This bundle is
the GJC equivalent: it exposes semantic search as a first-class tool, keeps the index fresh on every
session start, and gets the agent to actually reach for it before grepping.

## Surfaces

| Surface | What it does |
| --- | --- |
| `tools.code_search` | Semantic search over the jbcontext index, as an always-on tool. |
| `hooks.auto-index` | On session start, re-indexes the repo detached so search answers from current HEAD. |
| `system_appendix` | Reinforces when semantic search beats `search`/`find`/`read`. |

## Requirements

- `jbcontext` installed at `~/.jbcontext/bin/jbcontext` and authenticated (`jbcontext login`)

The index hook no-ops when the binary is missing, and `code_search` reports what to run if the
binary or index is absent, so an unconfigured machine degrades to plain `search`/`find` rather than
failing session start.

## Install

```sh
gjc plugin install https://github.com/devnogari/gjc-jbcontext --user
```

Use `--project` instead to scope it to a single repository. Verify with:

```sh
gjc plugin list
```

No MCP registration is needed — the tool loads in every session.

## Why a tool and not an MCP server

The obvious design is `mcps` in the manifest, pointing at `jbcontext mcp`. That works, but the
agent then almost never calls it on its own.

GJC's base system prompt maps code exploration onto `search`/`find`/`read` in its `<exploration>`
and `<tool-priority>` blocks. A plugin `system_appendix` is appended *after* that and is explicitly
marked lower-authority, so it cannot override the mapping. Measured on this bundle: appendix
wording, the same text promoted to user-level `AGENTS.md`, and a maximally forceful "the first tool
call MUST be..." phrasing all failed — the first call stayed `search` or `find` every time. Only
naming the tool explicitly in the request worked.

A tool *description* lives in the tool list, at the point where the model decides what to call, and
that does compete. With the same appendix text and the tool surface instead of MCP, the first call
becomes `code_search` on exploratory questions, while exact-symbol lookups still go to `search`.

Two secondary benefits:

- **No `--mcp-config` exclusivity.** A session started with `--mcp-config` skips plugin MCP servers
  entirely; plugin tools load either way.
- **No bridge script.** Plugin MCP stdio servers may only launch `node`/`bun` with a bundled script
  under a minimal environment and a short startup budget, which needed a pass-through bridge plus a
  `startup_timeout` field GJC does not ship. A custom tool just runs the CLI.
