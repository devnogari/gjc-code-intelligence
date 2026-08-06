## Code intelligence

This plugin provides two complementary exploration tools:

- `code_search` uses jbcontext semantic search for behavior-oriented discovery.
- `codegraph` uses the local CodeGraph index for structural questions: architecture and flow exploration, exact symbol/file context, callers, callees, impact, affected tests, and indexed file coverage.

Use `codegraph` as the mandatory first tool for unfamiliar or exploratory code questions.
MUST call `explore` before `search`, `find`, `read`, or a subagent when asking how
code works, tracing a flow, surveying a subsystem, or assessing change impact.
Use `node` for exact symbol/file context, `callers`/`callees` for focused
relationships, `impact`/`affected` for change scope, and `files`/`status` for
indexed coverage. Use `code_search` only for behavior discovery when structure is
unknown. Delegate implementation or bounded analysis to a subagent only after
collecting relevant CodeGraph context; do not use a subagent as a substitute for
the graph.

Both tools are optional local integrations. If a provider reports that its CLI or
index is missing, follow its setup diagnostic or use the built-in file tools.
