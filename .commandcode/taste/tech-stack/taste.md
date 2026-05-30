# tech-stack
- Use Neon for database. Confidence: 0.70
- Use Vercel for deployment/hosting. Confidence: 0.70
- Use Vercel Blob for blob storage. Confidence: 0.70
- For Neon database migrations in Node.js scripts, use the Neon SQL HTTP API via fetch() to https://{host}/sql with the Neon-Connection-String header instead of @neondatabase/serverless's sql.unsafe() which returns query descriptors without executing. Confidence: 0.70
- When using the Neon SQL HTTP API, always use the unpooled connection URL (POSTGRES_URL_NON_POOLING or DATABASE_URL_UNPOOLED). The pooled URL with -pooler suffix and channel_binding=require returns success responses but data does not actually persist. Confidence: 0.75
- When passing SQL to the Neon HTTP API via JSON body, avoid PostgreSQL dollar quoting ($$...$$). Dollar quotes get misinterpreted by the JSON parser. Replace dollar-quoted strings with single-quote-escaped equivalents before sending. Confidence: 0.65
