## Semantic code search

`code_search` searches this repository by meaning, over an index kept at HEAD.

Reach for it before `search`, `find`, or `read` whenever you are locating code
you have not already read in this session. A guessed grep pattern costs a round
trip and usually the wrong file; one semantic query returns ranked files with
line numbers and the surrounding source.

Go straight to `search`/`find`/`read` when you already hold an exact token — a
symbol from earlier output, a literal string, a path from a stack trace, a
config key — or when you need a complete enumeration of matches. Semantic search
ranks; it does not enumerate.

Query in full phrases describing behavior, one concept per call. Use
`pathFilter` (repo-relative) to scope to a module.
