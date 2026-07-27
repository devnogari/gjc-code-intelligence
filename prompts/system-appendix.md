## jbcontext semantic code search

`mcp__jbcontext_code_search` searches this repository by meaning, over an index kept at HEAD.

**When the request names a behavior, subsystem, or question rather than an identifier — "how does X work", "where is Y handled", "investigate Z" — call `mcp__jbcontext_code_search` first, before `search` or `find`.** It returns the relevant code with file paths and line numbers in one call, so the usual grep-then-read loop starts from real candidates instead of guesses.

Go straight to `search`/`find` when you already have the exact token: a known symbol name, a literal string, a filename, or a config key. Those are exact lookups and semantic search only adds latency.

Query in natural language, one concept per call. Single words ("email", "error") and keyword soups return noise; split multi-part questions into separate queries. Use `pathFilter` (repo-relative) to scope a query to a module.
