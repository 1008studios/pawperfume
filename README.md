# Messenger SAAS — Generic Multi-Tenant Facebook Messenger Platform

## 🚀 Quick Start

1. **Set up Neon Database**
   ```bash
   # Create a Neon project and get your DATABASE_URL
   # Add it to .env
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   ```

2. **Run migration**
   ```bash
   cd messenger-bridge
   npm install
   node scripts/migrate.js
   ```

3. **Deploy to Vercel**
   ```bash
   npm run deploy
   ```

4. **Configure Facebook**
   - Go to Facebook Developers → Add Messenger product
   - Set Webhook URL to `https://your-app.vercel.app/webhook`
   - Set Verify Token to whatever you put in `FB_VERIFY_TOKEN`
   - Subscribe to `messages`, `messaging_postbacks`, `message_echoes`, `standby`

## 📦 Project Structure

```
messenger-saas/
├── messenger-bridge/          # Vercel serverless API + Admin SPA
│   ├── api/
│   │   ├── admin.js           # Multi-tenant admin API handler
│   │   ├── db.js              # Database layer (Neon serverless)
│   │   └── webhook.js         # Facebook webhook handler
│   ├── lib/
│   │   ├── facebook-messenger-config.js
│   │   └── messenger-profile.js
│   ├── public/
│   │   └── admin.html         # SAAS Admin Dashboard (SPA)
│   ├── scripts/
│   │   └── migrate.js         # Schema migration
│   ├── package.json
│   └── index.js               # Vercel entry point
├── packages/
│   └── db/
│       └── schema.sql         # Multi-tenant database schema
├── vercel.json                # Vercel deployment config
├── .env.example               # Environment template
└── README.md
```

## 🏢 Multi-Tenant Architecture

Each business is a **tenant** with:
- Own Facebook Page configuration (token, app secret, page ID)
- Own branding (name, logo, colors, emoji)
- Own AI system prompt and automations
- Own FAQ knowledge base
- Own quick replies, orders, and finance ledger
- Isolated data — tenant A can't see tenant B's conversations

### How Tenants Work

- **Default tenant**: If no tenant is detected from subdomain, uses `default`
- **Subdomain routing**: `pawtraits.your-saas.com` → tenant `pawtraits`
- **Per-tenant DB**: All tables have `tenant_id` foreign key

## 🔧 Customization per Tenant

| Feature | How to Customize |
|---------|-----------------|
| Brand name | `tenants.brand_name` (set via DB or API) |
| Logo / Emoji | `tenants.brand_logo_url` / `tenants.brand_favicon_emoji` |
| Theme colors | `tenants.brand_primary_color` / `tenants.brand_accent_color` |
| AI System Prompt | `tenant_settings.ai_system_prompt` |
| Welcome message | `tenant_settings.welcome_message` |
| Guided intake flow | `tenant_settings` keys prefixed with `guided_intake:` |
| FAQ answers | `faqs` table per tenant |
| Automation sequences | `automations` table per tenant |

## 🎯 Facebook Integration

1. Create a Facebook App at developers.facebook.com
2. Add Messenger product
3. Generate a Page Access Token (long-lived)
4. Set up the webhook (URL + verify token)
5. Subscribe to `messages`, `messaging_postbacks`, `message_echoes`

## 💾 Database

Uses **Neon Serverless PostgreSQL** with `@neondatabase/serverless` driver.

Tables:
- `tenants` — Business accounts
- `tenant_users` — Login accounts per tenant
- `tenant_settings` — Customizable settings
- `conversations` — Facebook conversations
- `messages` — Individual messages
- `automations` — Automated message sequences
- `orders` — Order tracking
- `ledger_entries` — Finance tracking
- `quick_replies` — Reusable messages
- `faqs` — AI knowledge base
- `audit_log` — Activity log

## 🔐 Security

- Admin dashboard protected by password
- Facebook webhook protected by verify token + app secret proof
- Tenant data isolation via `tenant_id` on all tables
- Vercel Blob for secure file storage
