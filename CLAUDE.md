# Context

@README.md

- Before using any library or framework, look up its documentation with Context7 MCP.
- For LangChain/LangGraph, use Context7 to look up documentation at (`/langchain`).

# General requirements

- Use SRP, DRY, KISS and YAGNI.
- Prefer pure functions where practical.
- Avoid nested if statements and loops.
- Avoid excessive comments. Use descriptive function names instead.
- Prefer simple and readable code over performance.
- Prefer long and descriptive variable names to short and concise ones.
- Don't use magic numbers or strings. Assign them to a constant or variable instead.
- Multi-line LLM prompts should be extracted into markdown files in the `collector/src/prompts` folder.
- Test happy paths, error cases and important edge cases using Vitest.
- Tests should generally not overlap.
- When making plans, ask if anything is unclear.
- After writing code, double check that it follows the requirements.
- When restructuring or renaming folders/files, update README.md to reflect the new structure.
