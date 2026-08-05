## Code intelligence

This plugin provides two complementary exploration tools:

- `code_search` uses jbcontext semantic search for behavior-oriented discovery.
- `codegraph` uses the local CodeGraph index for structural questions: symbol lookup,
  callers, callees, impact, and contextual exploration.

Use `code_search` or `codegraph` before `search`, `find`, or `read` when the question
is exploratory and the relevant code has not already been read. Prefer `codegraph`
for call-graph and change-impact questions; prefer `code_search` for natural-language
concept discovery. Use `search`/`find`/`read` for exact tokens, complete enumeration,
or reading paths already identified.

Both tools are optional local integrations. If a provider reports that its CLI or
index is missing, follow its setup diagnostic or use the built-in file tools.
