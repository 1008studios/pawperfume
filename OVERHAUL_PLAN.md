# PawPerfume Full Overhaul Plan

## Goal
Make every page editable inline, add Vercel Blob drag-and-drop uploads, fix English copy, polish light/dark mode. Everything working.

## Phase 1: API Foundation

### 1a. Fix Orders Page
- `api.ts` return type for `orders()` missing `column_configs` — handler returns it but TypeScript type doesn't declare it. Fix the type.

### 1b. Add Missing PUT Routes to Handler
Add to `src/lib/admin-handler-secure.ts` (parameterized, following existing pattern):

| PUT Route | Fields |
|---|---|
| `faqs/:id` | question, answer, keywords |
| `quick-replies/:id` | label, message |
| `automations/:id` | name, trigger_type, trigger_value |
| `tags/:id` | tag_label, color |
| `media/:id` | filename, category |
| `finance/:id` | date, description, category, amount, type |
| `bot-flow/:id` | step_label, prompt_message, next_step, sort_order, button_choices, input_variable |

### 1c. Add API Client Methods
Add to `src/lib/api.ts`: `updateFaq`, `updateQuickReply`, `updateAutomation`, `updateTag`, `updateMedia`, `updateFinance`, `updateBotFlowStep`.

### 1d. All English Copy
Replace remaining Taglish strings across all pages with clean professional English.

## Phase 2: Shared InlineEdit Component

Create `src/lib/components/InlineEdit.svelte`:
- Svelte 5 runes ($state, $props, $bindable)
- Supported types: text, number, select, textarea
- Props: value, onSave, type, options, placeholder
- Behavior: click to edit, Enter/blur to save, Escape to cancel
- States: viewing, editing, saving, error
- Keyboard accessible, dark/light theme aware

## Phase 3: Inline Editing Per Page

### 3a. Orders
- Table cells inline-editable: customer_name, amount, notes
- Status: inline select (keep existing)
- Payment status: click-to-toggle

### 3b. Finance
- All table cells inline-editable: date, description, category, amount, type
- Category uses select with existing categories

### 3c. Quick Replies
- Card fields label and message inline-editable

### 3d. Bot Flow
- Step label, prompt message inline-editable
- Drag-and-drop reordering (HTML5 DnD API)
- On drop: swap sort_order via PUT calls

### 3e. Automations
- Card fields: name, trigger_type, trigger_value inline-editable

### 3f. Tags
- tag_label inline-editable
- Color: click to open mini color picker

### 3g. Media
- filename, category inline-editable

### 3h. FAQs
- question, answer, keywords inline-editable

## Phase 4: Vercel Blob Uploads

### 4a. Install @vercel/blob
Required env var: BLOB_READ_WRITE_TOKEN

### 4b. Upload API Route
New: `src/routes/api/admin/upload/+server.ts`
- Accepts multipart form data with file field
- Uploads to Vercel Blob via put()
- Inserts record into media_assets table

### 4c. Media Page Drag-and-Drop
- Large dashed drop zone at top
- Preview before upload, progress indicator
- File input fallback
- Keep URL input as secondary option

### 4d. CSP Headers
Update `src/hooks.server.ts`: allow `https://*.blob.vercel-storage.com`

## Phase 5: Light/Dark Mode Polish

- Fix hardcoded colors in page-level styles
- Ensure contrast in both themes
- Cards, tables, sidebar: clear hover/active states in dark mode
- InlineEdit: visible focus rings in both themes
- Drag-and-drop: visible drop zones in dark mode

## Files Changed (~20 files)
- `src/lib/admin-handler-secure.ts` — +7 PUT routes
- `src/lib/api.ts` — +7 update methods, fix orders type
- `src/lib/components/InlineEdit.svelte` — NEW
- `src/routes/orders/+page.svelte` — inline edit
- `src/routes/finance/+page.svelte` — inline edit
- `src/routes/quick-replies/+page.svelte` — inline edit
- `src/routes/bot-flow/+page.svelte` — inline edit + drag-drop
- `src/routes/automations/+page.svelte` — inline edit
- `src/routes/tags/+page.svelte` — inline edit
- `src/routes/media/+page.svelte` — inline edit + drag-drop upload
- `src/routes/faqs/+page.svelte` — inline edit
- `src/routes/api/admin/upload/+server.ts` — NEW
- `src/hooks.server.ts` — CSP update
- `src/app.css` — dark mode polish
- All 12 pages — English copy cleanup
