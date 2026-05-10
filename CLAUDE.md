# Context

@README.md

- The Context7 MCP is available for up-to-date documentation.

# General requirements

- Use SRP, DRY, KISS and YAGNI.
- Prefer pure functions where practical.
- Avoid nested if statements and loops.
- Avoid excessive comments. Use descriptive function names instead.
- Make simple and human-readable code.
- Prefer longer, descriptive variable names over short and concise ones.
- Don't use magic numbers or strings. Assign them to a constant or variable instead.
- Multi-line LLM prompts should be extracted into markdown files in the `collector/src/prompts` folder.
- Test happy paths, error cases and important edge cases using Vitest.
- Tests should generally not overlap.
- When making plans, ask if anything is unclear.
