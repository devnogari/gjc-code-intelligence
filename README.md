# gjc-jbcontext

A [Gajae-Code](https://github.com/Yeachan-Heo/gajae-code) plugin bundle that wires
[JetBrains Context](https://www.jetbrains.com/context/) (`jbcontext`) semantic code search into GJC.

`jbcontext setup-agent` supports claude/codex/intellij/junie/generic, but not GJC. This bundle is
the GJC equivalent: it keeps the index fresh on every session start and tells the agent to reach for
semantic search before grepping.

The MCP server itself is **not** declared here — see [Registering the MCP server](#registering-the-mcp-server).

## Surfaces

| Surface | What it does |
| --- | --- |
| `hooks.auto-index` | On session start, re-indexes the repo detached so search answers from current HEAD. |
| `system_appendix` | Makes `mcp__jbcontext_code_search` the default entry point into unfamiliar code. |

## Requirements

- `jbcontext` installed at `~/.jbcontext/bin/jbcontext` and authenticated (`jbcontext login`)

The index hook no-ops when the binary is missing, and the appendix tells the agent to fall back to
`search`/`find` when the MCP tools are absent, so an unconfigured machine just loses the tools rather
than failing session start.

## Install

```sh
gjc plugin install https://github.com/devnogari/gjc-jbcontext --user
```

Use `--project` instead to scope it to a single repository. Verify with:

```sh
gjc plugin list
```

## Registering the MCP server

GJC does not discover MCP configs. Register the server once:

```sh
gjc mcp add jbcontext --command ~/.jbcontext/bin/jbcontext --arg mcp
```

then launch sessions with that config:

```sh
gjc --mcp-config ~/.gjc/agent/mcp.json
```

This exposes `mcp__jbcontext_code_search` and `mcp__jbcontext_find_repositories` alongside every
other server in that file.

### Why not declare it in the manifest

Plugin-bundle MCP servers run under a stricter policy than `--mcp-config` servers: stdio may only
launch `node`/`bun` with a bundled script, the process gets a minimal environment, and the handshake
must finish inside a short startup window. Satisfying that took a pass-through bridge script plus a
`startup_timeout` field GJC did not have.

`--mcp-config` has none of those constraints — it runs the binary directly — and a session that uses
it ignores plugin-bundle MCP servers anyway, since the two paths are mutually exclusive. Declaring
the server in both places would mean maintaining the harder one for no additional reach.
