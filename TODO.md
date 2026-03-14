# High priority
- Add a calendar function on a separate page
- More information in footer, including link to new GitHub issue

# Medium priority
- Pagination per month
- Analytics
- Consider DDD. E.g extracting upsertEvents and deleteEvents logic to a repository
- Download calendar event (ICS or similar)
- Consider which event schemas are needed, and which we can throw away. Use https://schema.org/Event as baseline?

# Low priority
- Evals for prompts/llm models
- Create workaround for type issues for DS only allowing 4 colors for badges/tags/categories
- Categorize all events at the end, to reduce number of LLM calls
- Test deleteExpiredEvents, deleteDuplicateEvents and upsertEvents
- Favorite button tooltip and other a11y improvements
- SSG for improved SEO
