# gjc-jbcontext

A [Gajae-Code](https://github.com/Yeachan-Heo/gajae-code) plugin bundle that wires
[JetBrains Context](https://www.jetbrains.com/context/) (`jbcontext`) semantic code search into GJC.

`jbcontext setup-agent` supports claude/codex/intellij/junie/generic, but not GJC. This bundle is
the GJC equivalent: it registers the MCP server, keeps the index fresh on every session start, and
tells the agent when semantic search beats plain grep.

## Surfaces

| Surface | What it does |
| --- | --- |
| `mcps.jbcontext` | Exposes `mcp__jbcontext_code_search` and `mcp__jbcontext_find_repositories`. |
| `hooks.auto-index` | On session start, re-indexes the repo detached so search answers from current HEAD. |
| `system_appendix` | Tells the agent when to prefer semantic search over `search`/`find`. |

## Requirements

- `jbcontext` installed at `~/.jbcontext/bin/jbcontext` and authenticated (`jbcontext login`)
- `bun` on `PATH`
- GJC with plugin-bundle MCP `timeout` support

Both the MCP bridge and the index hook no-op when the binary is missing, so an unconfigured machine
just loses the tools rather than failing session start.

## Install

```sh
gjc plugin install https://github.com/devnogari/gjc-jbcontext --user
```

Use `--project` instead to scope it to a single repository. Verify with:

```sh
gjc plugin list
```

## Why the bridge script

GJC plugin-bundle MCP servers may only launch `node`/`bun` with a bundled script, and run with a
minimal environment. `mcp/jbcontext-server.ts` is a transparent stdio pass-through to
`jbcontext mcp` that satisfies that policy without touching JSON-RPC framing.

The manifest declares `"timeout": 5000` because the jbcontext handshake takes ~260ms, well past the
default startup budget for plugin MCP servers.
