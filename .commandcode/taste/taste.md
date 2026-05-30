# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# tech-stack
- Use Neon for database. Confidence: 0.70
- Use Vercel for deployment/hosting. Confidence: 0.70
- Use Vercel Blob for blob storage. Confidence: 0.70
- For Neon database migrations in Node.js scripts, use the Neon SQL HTTP API via fetch() to https://{host}/sql with the Neon-Connection-String header instead of @neondatabase/serverless's sql.unsafe() which returns query descriptors without executing. Confidence: 0.70
- When using the Neon SQL HTTP API, always use the unpooled connection URL (POSTGRES_URL_NON_POOLING or DATABASE_URL_UNPOOLED). The pooled URL with -pooler suffix and channel_binding=require returns success responses but data does not actually persist. Confidence: 0.75

# workflow
- Use multi-agent team structure with BOSS agent for approval, research agents, debate agents, worker agents, and tester agents. Confidence: 0.65
- Take full ownership of infrastructure/setup tasks; execute autonomously and report back when done instead of asking for step-by-step approval. Confidence: 0.70

# architecture
- Avoid hardcoded business-specific values; make everything data-driven and tenant-customizable via database config. Confidence: 0.75

# billing
- No Stripe billing integration needed. Confidence: 0.70

