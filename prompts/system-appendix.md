## jbcontext semantic code search

`mcp__jbcontext_code_search` is available and indexes the current repository at HEAD.

Reach for it when you need to find code by **meaning** rather than by an exact token: "where is the retry budget applied to outbound webhooks", "which component owns the session close timeout". It complements `search`/`find` — it does not replace them. When you already know the symbol name or a literal string, plain `search` is faster and exact.

Query in natural language, describing one concept per call. Single words ("email", "error") and keyword soups return noise; split multi-part questions into separate queries. Use `pathFilter` (repo-relative) to scope a query to a module.
