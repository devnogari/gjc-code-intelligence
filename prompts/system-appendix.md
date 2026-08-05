## Code intelligence

This plugin provides two complementary exploration tools:

- `code_search` uses jbcontext semantic search for behavior-oriented discovery.
- `codegraph` uses the local CodeGraph index for structural questions: architecture and flow exploration, exact symbol/file context, callers, callees, impact, affected tests, and indexed file coverage.

Use `code_search` or `codegraph` before `search`, `find`, or `read` when the question
is exploratory and the relevant code has not already been read. Prefer `codegraph`
`explore` for architecture and flows, `node` for exact symbol/file context,
`callers`/`callees` for focused relationships, and `impact`/`affected` for change
scope. Use `code_search` for natural-language concept discovery and
`search`/`find`/`read` for exact tokens, complete enumeration, or known paths.

Both tools are optional local integrations. If a provider reports that its CLI or
index is missing, follow its setup diagnostic or use the built-in file tools.
