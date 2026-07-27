## jbcontext semantic code search

`mcp__jbcontext_code_search` searches this repository by meaning, over an index kept at HEAD. It returns ranked file paths with line numbers and the surrounding code in one call.

**Make it the default entry point into unfamiliar code.** Before the first `search`, `find`, or `read` of an exploration, ask whether you actually know where to look. If the answer comes from a guess about naming or layout, call `mcp__jbcontext_code_search` instead — a guessed grep pattern costs a round trip and a wrong file; a semantic query costs one call and lands on the real code.

Prefer it over:

- `search` when the pattern is a guess at how something might be named or spelled, when a first pattern returned nothing or too much, or when the question is about behavior rather than a literal token.
- `find` when you are guessing at a path or filename to locate a feature.
- `read` when you are opening a file to check whether it is the right one. Search first, then read the file and lines it names.

Go straight to `search`/`find`/`read` when you already hold the exact token: a symbol you just saw in output, a literal string, a path from a stack trace or a previous result, or a config key. Those are lookups, not searches, and semantic search only adds latency.

Query in natural language, one concept per call. Single words ("email", "error") and keyword soups return noise; split multi-part questions into separate queries. Use `pathFilter` (repo-relative) to scope a query to a module.

If the tool is not present in this session, the MCP server is not loaded — use `search`/`find` and do not mention it.
