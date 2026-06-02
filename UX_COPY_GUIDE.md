# PawPerfume UX Copy Guide

> **Complete copy reference for all 12 pages.**
> Voice: Warm, practical, Filipino-small-business friendly. Think *tindahan owner who also happens to be tech-savvy* — hindi condescending, hindi sobrang formal, parang kaibigan na nagti-tip.

---

## Voice & Tone Principles

### Who We Sound Like
- A supportive friend who also runs a small business — we *get it*
- Practical over precious — we'd rather help than impress
- Warm but not cheesy — Taglish sprinkled naturally, never forced
- Honest about problems — no corporate "we apologize for the inconvenience"

### Taglish Guidelines
| ✅ Do | ❌ Don't |
|---|---|
| Use Taglish in empty states & toasts where it feels natural | Force Tagalog into technical labels (e.g., "Column Configuration" stays English) |
| "Wala pang orders — mag-add ka na!" | "Walang mga orden na naitala sa sistema" |
| "Ayos na! Na-save na ang settings mo." | "Ang mga setting ay matagumpay na na-save" |
| Mix naturally: "Order #123 created! 📦 Pupunta na yan sa list mo." | Pure Tagalog or pure English when the other fits better |
| Use it for warmth and encouragement | Use it for error codes or technical messages |

### The 3 Rules
1. **Every empty state must answer**: "Ano ngayon?" (What now?) — always include a CTA
2. **Every toast must confirm**: What happened + what it means for the user
3. **Every error must reassure**: Something broke ≠ the end of the world

---

## 1. EMPTY STATES

### 🔑 General Pattern
```
[Emoji icon]
[Headline: short, warm, direct]
[Body: explain what goes here + why it matters]
[CTA button: action verb, specific]
```

---

### Page 1: Login

**Location**: Login page (no empty state, but copy improvements below)

| Element | Current | Suggested | Why |
|---|---|---|---|
| Subtitle | "Sign in to your workspace" | "Tara, log in ka na sa iyong workspace 🧴" | Warmer, more inviting |
| Password label | "Password" | "Password" *(keep)* | Technical label, stay clear |
| Placeholder | "Enter your password" | "Ilagay ang password mo" | Natural Taglish |
| Error: bad pw | "Invalid password" | "Hindi tama ang password. Try mo ulit?" | Less robotic, offers next step |
| Error: server | "Failed to connect to server" | "Hindi maka-connect sa server. Check mo ang internet mo, tapos try ulit." | Helpful, not scary |
| Success toast | "Welcome back!" | "Welcome back! Tara, check natin ang business mo today 🧴" | Warmer, sets positive tone |

---

### Page 2: Dashboard

**Location**: `/dashboard`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Revenue chart empty | "No revenue data yet" + 📈 | **Headline**: "Wala pang revenue data" <br> **Body**: "Once you have orders, makikita mo dito ang daily sales mo for the past 7 days." | Explains value, sets expectation |
| Order status chart empty | "No orders yet" + 📊 | **Headline**: "Wala pang orders" <br> **Body**: "Mag-log ng first order mo at makikita mo dito ang breakdown ng statuses." | Actionable |
| Recent conversations empty | "No conversations yet / Customer messages will show up here once they start chatting with your bot." | **Headline**: "Walang conversations pa" <br> **Body**: "Pag nag-message ang customers sa bot mo, dito sila mag-a-appear. Set up your bot flow para ready ka na!" <br> **CTA**: `→ Set Up Bot Flow` | Connects to Bot Flow page |
| Loading skeleton | *(skeleton cards — keep as-is)* | Add text below skeletons: "Hinihila ang data mo... ⏳" | Friendly loading context |

---

### Page 3: Orders

**Location**: `/orders`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Empty table (no orders at all) | "No orders yet / Ready to log your first sale? Track customer orders, payments, and deliveries all in one place." + CTA | **Headline**: "Wala pang orders — tara, mag-add na! 📦" <br> **Body**: "Dito mo i-track ang lahat ng sales mo — from new order to completed. Pwede ka ring mag-export ng CSV for your records." <br> **CTA**: `+ Log Your First Order` | More energetic, mentions CSV export as a benefit |
| Empty filtered results (search returns nothing) | *(no specific state)* | **Headline**: "Walang match sa search mo" <br> **Body**: "Try mo ibang keyword, or i-clear ang search para makita lahat ng orders." | Handles a real edge case |
| Empty tab (e.g., "Completed" tab with 0 items) | *(no specific state)* | **Headline**: "Walang {status} orders" <br> **Body**: "Pag may orders na na-{status}, dito sila mag-a-appear." | Context-aware |

---

### Page 4: Chats

**Location**: `/chats`

| Section | Current | Suggested | Why |
|---|---|---|---|
| No conversations (left panel) | "No conversations found" | **Headline**: "Wala pang conversations 💬" <br> **Body**: "Pag nag-message ang customers sa Messenger, makikita mo dito ang lahat ng chats. Make sure your bot is connected!" | Explains the trigger |
| No messages in a conversation | "No messages yet / Start the conversation by typing a message below." | **Headline**: "Wala pang messages sa conversation na ito" <br> **Body**: "Be the first to say hi! Type your message below." | Warmer |
| No conversation selected (right panel) | "Select a conversation to start chatting" + 💬 | **Headline**: "Pumili ng conversation sa kaliwa 👈" <br> **Body**: "Click any chat sa left panel para makita ang messages at makapag-reply." | Direct and clear with directional cue |
| Search empty | *(no state)* | **Headline**: "Walang match" <br> **Body**: "Try mo ibang name or keyword." | Quick and helpful |

---

### Page 5: Finance

**Location**: `/finance`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Empty ledger | "No entries yet / Track your income and expenses here. Add your first entry to start monitoring cash flow." | **Headline**: "Wala pang finance entries 💰" <br> **Body**: "Dito mo i-monitor ang cash flow ng business mo — income man or expenses. Add your first entry para makita mo kung profitable ka na!" <br> **CTA**: `+ Add Your First Entry` | More motivating — "makita mo kung profitable ka na!" is a real hook |
| Loading | "Loading..." | "Hinihila ang finance data mo..." | Context-specific |

---

### Page 6: Automations

**Location**: `/automations`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Empty list | "No automations yet" + 🔁 | **Headline**: "Wala pang automations 🔁" <br> **Body**: "Automations let your bot respond automatically kapag may nag-type ng specific keyword. Halimbawa: pag nag-type ang customer ng 'hi', automatic reply agad!" <br> **CTA**: `+ Create Your First Automation` | Explains the *why* with a concrete example |
| Loading | "Loading..." | "Hinihila ang automations mo..." | Context |

---

### Page 7: Bot Flow

**Location**: `/bot-flow`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Empty flow | "No bot flow steps yet" + 🤖 | **Headline**: "Wala pang bot flow steps 🤖" <br> **Body**: "Bot flow is like a script for your bot — step by step, it guides customers through questions like 'Anong scent gusto mo?' or 'Saan i-deliver?' Start building your flow!" <br> **CTA**: `+ Add Your First Step` | Uses relatable perfume-business examples |
| Loading | "Loading..." | "Hinihila ang bot flow mo..." | Context |

---

### Page 8: FAQs

**Location**: `/faqs`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Empty list | "No FAQs yet" + ❓ | **Headline**: "Wala pang FAQs ❓" <br> **Body**: "Add the questions customers always ask — like 'Magkano ang shipping?' or 'Meron ba kayong tester?' Your bot will use these to answer faster." <br> **CTA**: `+ Add Your First FAQ` | Real examples from a perfume business |
| Loading | "Loading..." | "Hinihila ang FAQs mo..." | Context |

---

### Page 9: Media

**Location**: `/media`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Empty gallery | "No media yet" + 🖼️ | **Headline**: "Wala pang media files 🖼️" <br> **Body**: "Upload product photos, receipts, or any images your bot might need. Mas appealing ang catalog mo with good photos!" <br> **CTA**: `+ Upload Your First Media` | Connects media to business outcome |
| Loading | "Loading..." | "Hinihila ang media files mo..." | Context |

---

### Page 10: Quick Replies

**Location**: `/quick-replies`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Empty list | "No quick replies yet" + ⚡ | **Headline**: "Wala pang quick replies ⚡" <br> **Body**: "Quick replies are pre-written messages you can send in one click. Perfect for common responses like 'Salamat sa order mo!' or 'Available pa yan!'" <br> **CTA**: `+ Create Your First Quick Reply` | Real examples, explains the time-saving benefit |
| Loading | "Loading..." | "Hinihila ang quick replies mo..." | Context |

---

### Page 11: Tags

**Location**: `/tags`

| Section | Current | Suggested | Why |
|---|---|---|---|
| Empty list | "No tags yet" + 🏷️ | **Headline**: "Wala pang tags 🏷️" <br> **Body**: "Tags help you organize customers and orders — try 'VIP', 'Wholesale', or 'New Customer'. Mas madaling i-filter at i-track ang business mo!" <br> **CTA**: `+ Create Your First Tag` | Business-relevant examples |
| Loading | "Loading..." | "Hinihila ang tags mo..." | Context |

---

### Page 12: Settings

**Location**: `/settings`

Settings doesn't have a traditional empty state (it always has data), but here are copy improvements:

| Section | Current | Suggested | Why |
|---|---|---|---|
| Loading | "Loading..." | "Hinihila ang settings mo... ⚙️" | Context |
| Save button | "Save Changes" | "I-save ang Changes" | Subtle Taglish |
| Saving state | "Saving..." | "Sine-save..." | Consistent |
| Brand section heading | "Brand" | "Brand" *(keep)* | Clear |
| AI Bot section heading | "AI Bot" | "AI Bot" *(keep)* | Clear |
| System Info heading | "System Info" | "System Info" *(keep)* | Clear |

---

## 2. TOAST MESSAGES

### 🔑 General Pattern
```
[Action] [specific object] [optional emoji]
```

For success: Include the object name/ID when possible. Add context for what it means.
For errors: Reassure + suggest next step. Never just "Failed to X".

---

### Toast Message Catalog

| Page | Action | Current Toast | Suggested Toast |
|---|---|---|---|
| **Login** | Success | "Welcome back!" | "Welcome back! Tara, check natin ang business mo 🧴" |
| **Login** | Error | "Invalid password" | "Hindi tama ang password. Try mo ulit?" |
| **Login** | Error | "Failed to connect to server" | "Hindi maka-connect. Check mo ang internet mo, tapos try ulit." |
| **Dashboard** | Error | "Failed to load dashboard" | "Hindi ma-load ang dashboard. Try mo i-refresh ang page." |
| **Orders** | Create | "Order created" | "Order #{id} created! 📦 Nasa list na yan." |
| **Orders** | Update | "Order updated" | "Order #{id} updated! ✓ Na-save na ang changes." |
| **Orders** | Delete | "Order deleted" | "Order #{id} deleted 🗑️ Na-remove na sa list." |
| **Orders** | Error create | "Failed to save order" | "Hindi ma-save ang order. Check mo ang fields, tapos try ulit." |
| **Orders** | Error delete | "Failed to delete" | "Hindi ma-delete ang order. Try mo ulit in a few seconds." |
| **Orders** | Error load | "Failed to load orders" | "Hindi ma-load ang orders. Check mo ang connection mo." |
| **Orders** | Export | "CSV exported" | "CSV exported! 📄 Check mo ang downloads folder mo." |
| **Orders** | Column add | "Column added" | "Column added! ✓ Makikita mo na sa table." |
| **Orders** | Column update | "Column updated" | "Column updated! ✓" |
| **Orders** | Column error | "Failed to update/add column" | "Hindi ma-update ang column. Try mo ulit." |
| **Chats** | Send | "Message sent" | "Message sent! ✓" |
| **Chats** | Error send | "Failed to send message" | "Hindi ma-send ang message. Check mo ang connection mo, tapos try ulit." |
| **Chats** | Error load | "Failed to load messages" | "Hindi ma-load ang messages. Try mo i-refresh." |
| **Finance** | Create | "Entry added" | "Entry added! ₱{amount} na-record na." |
| **Finance** | Delete | "Entry deleted" | "Entry deleted 🗑️" |
| **Finance** | Error create | "Failed to add entry" | "Hindi ma-add ang entry. Check mo ang fields, tapos try ulit." |
| **Finance** | Error delete | "Failed to delete" | "Hindi ma-delete ang entry. Try mo ulit." |
| **Finance** | Error load | "Failed to load finance data" | "Hindi ma-load ang finance data. Try mo i-refresh." |
| **Automations** | Create | "Automation added" | "Automation added! 🔁 Active na yan." |
| **Automations** | Delete | "Automation deleted" | "Automation deleted 🗑️ Pwede ka mag-add ulit anytime." |
| **Automations** | Error create | "Failed to add automation" | "Hindi ma-add ang automation. Check mo ang details, tapos try ulit." |
| **Automations** | Error delete | "Failed to delete" | "Hindi ma-delete ang automation. Try mo ulit." |
| **Automations** | Error load | "Failed to load automations" | "Hindi ma-load ang automations. Try mo i-refresh." |
| **Bot Flow** | Create | "Step added" | "Step added! 🤖 Nasa flow na yan." |
| **Bot Flow** | Delete | "Step deleted" | "Step deleted 🗑️" |
| **Bot Flow** | Error create | "Failed to add step" | "Hindi ma-add ang step. Check mo ang details, tapos try ulit." |
| **Bot Flow** | Error delete | "Failed to delete" | "Hindi ma-delete ang step. Try mo ulit." |
| **Bot Flow** | Error load | "Failed to load bot flow" | "Hindi ma-load ang bot flow. Try mo i-refresh." |
| **FAQs** | Create | "FAQ added" | "FAQ added! ❓ Sasagot na ang bot dito." |
| **FAQs** | Delete | "FAQ deleted" | "FAQ deleted 🗑️" |
| **FAQs** | Error create | "Failed to add FAQ" | "Hindi ma-add ang FAQ. Check mo ang details, tapos try ulit." |
| **FAQs** | Error delete | "Failed to delete" | "Hindi ma-delete ang FAQ. Try mo ulit." |
| **FAQs** | Error load | "Failed to load FAQs" | "Hindi ma-load ang FAQs. Try mo i-refresh." |
| **Media** | Create | "Media added" | "Media added! 🖼️ Ready na gamitin." |
| **Media** | Delete | "Media deleted" | "Media deleted 🗑️" |
| **Media** | Error create | "Failed to add media" | "Hindi ma-add ang media. Check mo ang URL, tapos try ulit." |
| **Media** | Error delete | "Failed to delete" | "Hindi ma-delete ang media. Try mo ulit." |
| **Media** | Error load | "Failed to load media" | "Hindi ma-load ang media files. Try mo i-refresh." |
| **Quick Replies** | Create | "Quick reply added" | "Quick reply added! ⚡ Ready na gamitin sa chats." |
| **Quick Replies** | Delete | "Reply deleted" | "Quick reply deleted 🗑️" |
| **Quick Replies** | Copy | "Copied to clipboard" | "Copied! 📋 I-paste mo lang kung saan mo gusto." |
| **Quick Replies** | Error create | "Failed to add reply" | "Hindi ma-add ang quick reply. Try mo ulit." |
| **Quick Replies** | Error delete | "Failed to delete" | "Hindi ma-delete ang quick reply. Try mo ulit." |
| **Quick Replies** | Error load | "Failed to load quick replies" | "Hindi ma-load ang quick replies. Try mo i-refresh." |
| **Tags** | Create | "Tag added" | "Tag added! 🏷️ Pwede mo na gamitin sa orders at customers." |
| **Tags** | Delete | "Tag deleted" | "Tag deleted 🗑️" |
| **Tags** | Error create | "Failed to add tag" | "Hindi ma-add ang tag. Try mo ulit." |
| **Tags** | Error delete | "Failed to delete" | "Hindi ma-delete ang tag. Try mo ulit." |
| **Tags** | Error load | "Failed to load tags" | "Hindi ma-load ang tags. Try mo i-refresh." |
| **Settings** | Save | "Settings saved" | "Settings saved! ✓ Na-apply na ang lahat ng changes." |
| **Settings** | Error save | "Failed to save settings" | "Hindi ma-save ang settings. Baka may nawala — try mo ulit." |
| **Settings** | Error load | "Failed to load settings" | "Hindi ma-load ang settings. Try mo i-refresh ang page." |

---

## 3. CONFIRMATION DIALOGS

> ⚠️ **Critical Issue**: Most pages currently use the browser's native `confirm()` dialog, which is jarring, unbranded, and offers zero reassurance. Replace with a custom modal component.

### 🔑 General Pattern
```
Title: [Clear action question]
Body: [What happens + reassurance]
Cancel: "Cancel" / "Huwag muna"
Confirm: [Specific action verb, not just "OK"]
Danger confirm: Red button
```

---

### Confirmation Dialog Catalog

| Page | Action | Current Dialog | Suggested Dialog |
|---|---|---|---|
| **Orders** | Delete order | `confirm('Delete this order?')` *(implied)* | **Title**: "Delete Order #{id}?" <br> **Body**: "Hindi mo na ma-undo ito, pero pwede ka mag-create ng bagong order anytime." <br> **Cancel**: "Cancel" <br> **Confirm** (red): "Yes, Delete" |
| **Finance** | Delete entry | `confirm('Delete this entry?')` | **Title**: "Delete This Entry?" <br> **Body**: "Ma-remove ito sa finance records mo. Hindi na ito ma-undo." <br> **Cancel**: "Cancel" <br> **Confirm** (red): "Yes, Delete" |
| **Automations** | Delete automation | `confirm('Delete this automation?')` | **Title**: "Delete This Automation?" <br> **Body**: "Ma-remove ito at hindi na auto-rereply ang bot sa keyword na ito. Pwede mo naman i-recreate anytime." <br> **Cancel**: "Cancel" <br> **Confirm** (red): "Yes, Delete" |
| **Bot Flow** | Delete step | `confirm('Delete this step?')` | **Title**: "Delete This Bot Flow Step?" <br> **Body**: "Ma-remove ito sa bot flow mo. Kung may next step na naka-link dito, baka ma-disrupt ang flow." <br> **Cancel**: "Cancel" <br> **Confirm** (red): "Yes, Delete" |
| **FAQs** | Delete FAQ | `confirm('Delete this FAQ?')` | **Title**: "Delete This FAQ?" <br> **Body**: "Hindi na ito ma-sasagot ng bot mo sa customers. Pwede mo naman i-add ulit anytime." <br> **Cancel**: "Cancel" <br> **Confirm** (red): "Yes, Delete" |
| **Media** | Delete media | `confirm('Delete this media?')` | **Title**: "Delete This Media?" <br> **Body**: "Ma-remove ito sa media library mo. Hindi na ito ma-undo." <br> **Cancel**: "Cancel" <br> **Confirm** (red): "Yes, Delete" |
| **Quick Replies** | Delete reply | `confirm('Delete this quick reply?')` | **Title**: "Delete This Quick Reply?" <br> **Body**: "Hindi mo na ito ma-gagamit sa chats. Pwede ka mag-add ulit kung kailangan mo." <br> **Cancel**: "Cancel" <br> **Confirm** (red): "Yes, Delete" |
| **Tags** | Delete tag | `confirm('Delete this tag?')` | **Title**: "Delete This Tag?" <br> **Body**: "Ma-remove ito sa tags mo. Any items na naka-tag dito ay ma-u-untag." <br> **Cancel**: "Cancel" <br> **Confirm** (red): "Yes, Delete" |
| **Orders** | Mark completed *(if added)* | — | **Title**: "Mark Order #{id} as Completed?" <br> **Body**: "Ilipat ito sa completed list. Pwede mo pa rin i-check ang details anytime." <br> **Cancel**: "Cancel" <br> **Confirm**: "Mark as Completed" |
| **Orders** | Export CSV *(if added)* | — | **Title**: "Export Orders as CSV?" <br> **Body**: "Ma-download ang {count} orders as CSV file. Pwede mo itong buksan sa Excel or Google Sheets." <br> **Cancel**: "Cancel" <br> **Confirm**: "Export" |

---

## 4. LOADING STATES

### 🔑 General Pattern
```
[Context-specific message about what's loading] [subtle animation]
```

Never just "Loading..." — always tell the user *what* is loading and optionally *why* it matters.

---

### Loading State Catalog

| Page | Current | Suggested | Notes |
|---|---|---|---|
| **Login** | *(spinner on button)* | "Signing in..." | Keep as button spinner — good |
| **Global (auth check)** | "Loading..." | "Che-check kung naka-login ka..." | Friendlier |
| **Dashboard** | *(skeleton cards)* | *(keep skeletons)* + "Hinihila ang dashboard data..." below | Skeletons are great, add text |
| **Orders** | *(skeleton table)* | *(keep skeletons)* + "Hinihila ang orders mo..." below | Good pattern |
| **Chats** | *(no specific state)* | "Hinihila ang conversations..." | Add to conversations panel |
| **Finance** | "Loading..." | "Hinihila ang finance records..." | Context-specific |
| **Automations** | "Loading..." | "Hinihila ang automations..." | Context-specific |
| **Bot Flow** | "Loading..." | "Hinihila ang bot flow steps..." | Context-specific |
| **FAQs** | "Loading..." | "Hinihila ang FAQs..." | Context-specific |
| **Media** | "Loading..." | "Hinihila ang media files..." | Context-specific |
| **Quick Replies** | "Loading..." | "Hinihila ang quick replies..." | Context-specific |
| **Tags** | "Loading..." | "Hinihila ang tags..." | Context-specific |
| **Settings** | "Loading..." | "Hinihila ang settings..." | Context-specific |

### Inline Loading (Buttons)
| Context | Current | Suggested |
|---|---|---|
| Saving settings | "Saving..." | "Sine-save..." |
| Sending message | *(spinner)* | "Sending..." |
| Saving order | *(no state)* | "Sine-save ang order..." |
| Deleting | *(no state)* | "Dine-delete..." |

---

## 5. ERROR MESSAGES

### 🔑 General Pattern
```
[What went wrong in plain language] + [Reassurance] + [What to do next]
```

Never say "Error" or use technical codes. Always give a next step.

---

### Error Message Catalog

| Page | Error Type | Current | Suggested |
|---|---|---|---|
| **Login** | Bad password | "Invalid password" | "Hindi tama ang password. Try mo ulit?" |
| **Login** | Server down | "Failed to connect to server" | "Hindi maka-connect sa server. Check mo ang internet mo, tapos try ulit in a few seconds." |
| **Dashboard** | Load fail | "Failed to load dashboard" | "Hindi ma-load ang dashboard. Try mo i-refresh ang page — kung ayaw pa rin, baka may issue sa connection." |
| **Orders** | Load fail | "Failed to load orders" | "Hindi ma-load ang orders. Check mo ang internet mo at try i-refresh." |
| **Orders** | Save fail | "Failed to save order" | "Hindi ma-save ang order. Siguraduhin na complete ang lahat ng fields, tapos try ulit." |
| **Orders** | Delete fail | "Failed to delete" | "Hindi ma-delete ang order. Baka may ginagawa ang server — try mo ulit in a few seconds." |
| **Chats** | Load messages | "Failed to load messages" | "Hindi ma-load ang messages. Try mo i-refresh or pumili ng ibang conversation." |
| **Chats** | Send fail | "Failed to send message" | "Hindi ma-send ang message. Check mo ang connection mo at try ulit." |
| **Finance** | Load fail | "Failed to load finance data" | "Hindi ma-load ang finance data. Try mo i-refresh ang page." |
| **Finance** | Add fail | "Failed to add entry" | "Hindi ma-add ang entry. Check mo na may amount at date, tapos try ulit." |
| **Finance** | Delete fail | "Failed to delete" | "Hindi ma-delete ang entry. Try mo ulit in a moment." |
| **Automations** | Load fail | "Failed to load automations" | "Hindi ma-load ang automations. Try mo i-refresh." |
| **Automations** | Add fail | "Failed to add automation" | "Hindi ma-add ang automation. Check mo na may trigger type at value, tapos try ulit." |
| **Automations** | Delete fail | "Failed to delete" | "Hindi ma-delete ang automation. Try mo ulit." |
| **Bot Flow** | Load fail | "Failed to load bot flow" | "Hindi ma-load ang bot flow. Try mo i-refresh ang page." |
| **Bot Flow** | Add fail | "Failed to add step" | "Hindi ma-add ang step. Check mo na may step key at prompt message, tapos try ulit." |
| **Bot Flow** | Delete fail | "Failed to delete" | "Hindi ma-delete ang step. Try mo ulit." |
| **FAQs** | Load fail | "Failed to load FAQs" | "Hindi ma-load ang FAQs. Try mo i-refresh." |
| **FAQs** | Add fail | "Failed to add FAQ" | "Hindi ma-add ang FAQ. Check mo na may question at answer, tapos try ulit." |
| **FAQs** | Delete fail | "Failed to delete" | "Hindi ma-delete ang FAQ. Try mo ulit." |
| **Media** | Load fail | "Failed to load media" | "Hindi ma-load ang media files. Try mo i-refresh." |
| **Media** | Add fail | "Failed to add media" | "Hindi ma-add ang media. Check mo na valid ang URL, tapos try ulit." |
| **Media** | Delete fail | "Failed to delete" | "Hindi ma-delete ang media. Try mo ulit." |
| **Quick Replies** | Load fail | "Failed to load quick replies" | "Hindi ma-load ang quick replies. Try mo i-refresh." |
| **Quick Replies** | Add fail | "Failed to add reply" | "Hindi ma-add ang quick reply. Check mo na may label at message, tapos try ulit." |
| **Quick Replies** | Delete fail | "Failed to delete" | "Hindi ma-delete ang quick reply. Try mo ulit." |
| **Tags** | Load fail | "Failed to load tags" | "Hindi ma-load ang tags. Try mo i-refresh." |
| **Tags** | Add fail | "Failed to add tag" | "Hindi ma-add ang tag. Check mo na may key at label, tapos try ulit." |
| **Tags** | Delete fail | "Failed to delete" | "Hindi ma-delete ang tag. Try mo ulit." |
| **Settings** | Load fail | "Failed to load settings" | "Hindi ma-load ang settings. Try mo i-refresh ang page." |
| **Settings** | Save fail | "Failed to save settings" | "Hindi ma-save ang settings. Baka may nawala — check mo ang fields at try ulit." |

### Global/Network Errors

| Error Type | Suggested |
|---|---|
| No internet | "Walang internet connection. Check mo ang wifi o data mo, tapos try ulit." |
| Server timeout | "Medyo matagal ang server. Try mo ulit in a few seconds." |
| 401 Unauthorized | "Nag-expire na ang session mo. Mag-log in ulit para makapag-continue." |
| 500 Server error | "May problema sa server namin. Sorry ha! Try mo ulit in a few minutes." |
| Unknown error | "May nangyari na hindi namin expected. Try mo i-refresh ang page, and kung ayaw pa rin, contact support." |

---

## 6. ONBOARDING

### 🔑 General Pattern
- First-time users get a welcome modal + guided tour
- Returning users get contextual tooltips on complex features
- Pro tips appear as subtle banners or tooltip hovers
- Keyboard shortcut hints appear in relevant UI areas

---

### 6A. First-Time Welcome Modal

**Trigger**: First login (detect via `localStorage` flag or first-visit API response)

```
┌─────────────────────────────────────────────┐
│                                             │
│  🧴 Welcome sa PawPerfume!                  │
│                                             │
│  Excited kami na makatulong sa perfume      │
│  business mo! Here's a quick tour para       │
│  makapag-start ka agad:                     │
│                                             │
│  📊 Dashboard — Makita ang overview ng      │
│     sales at conversations mo               │
│  📦 Orders — I-track ang lahat ng orders    │
│     mo from new to completed                │
│  💬 Chats — Reply sa customers directly     │
│     from the app                            │
│  🤖 Bot Flow — Set up ang automated         │
│     conversation flow ng bot mo             │
│                                             │
│  💡 Pro Tip: Press Ctrl+K anytime para      │
│     sa command palette — mabilis na         │
│     navigation!                             │
│                                             │
│  [ Take Me to Dashboard ]  [ Show Me More ] │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 6B. Contextual Tooltips (First 3 Visits per Page)

| Page | Tooltip Target | Tooltip Text |
|---|---|---|
| **Dashboard** | Revenue chart | "💡 Dito makikita ang daily sales mo for the past 7 days. Mag-a-update automatically pag may bagong orders." |
| **Dashboard** | Order status chart | "💡 Makikita dito kung ilan ang new, confirmed, completed, at cancelled orders mo." |
| **Orders** | "+ New Order" button | "💡 Click dito para mag-log ng bagong order. Pwede mo i-fill ang customer name, amount, at status." |
| **Orders** | Column manager | "💡 I-customize ang columns sa table mo — i-rename, i-reorder, or i-hide ang mga hindi mo kailangan." |
| **Orders** | Export button | "💡 I-download ang lahat ng orders mo as CSV. Pwede mo buksan sa Excel or Google Sheets." |
| **Chats** | Quick replies bar | "💡 Gamitin ang quick replies para mabilis na mag-reply. Pwede ka mag-add ng sarili mong templates sa Quick Replies page." |
| **Chats** | Reply box | "💡 Press Enter para mag-send, Shift+Enter para sa new line." |
| **Finance** | "+ Add Entry" button | "💡 Mag-add ng income or expense entry. Good habit: i-log ang expenses mo daily para updated ang cash flow." |
| **Automations** | "+ Add Automation" button | "💡 Mag-set ng keyword trigger — halimbawa, pag nag-type ang customer ng 'price', auto-reply agad ang bot." |
| **Bot Flow** | "+ Add Step" button | "💡 Each step is a question or prompt sa conversation. I-chain ang steps para gumawa ng full flow — like an order form!" |
| **FAQs** | "+ Add FAQ" button | "💡 Add questions na madalas itanong ng customers. Ang bot mo ay gagamitin ito para sumagot automatically." |
| **Quick Replies** | "Copy" button | "💡 I-copy ang message sa clipboard para i-paste mo sa chat. Pwede rin i-click directly sa chat panel." |
| **Tags** | "+ Add Tag" button | "💡 Gamitin ang tags para i-organize ang customers — halimbawa: VIP, Wholesale, New Customer." |
| **Media** | "+ Add Media" button | "💡 Upload product photos at other images na gagamitin ng bot mo sa conversations." |
| **Settings** | AI Bot section | "💡 I-customize ang personality ng bot mo. Try mo ang Taglish language setting para natural ang dating sa Filipino customers!" |

---

### 6C. Pro Tips (Subtle Banners)

Show as dismissible info banners at the top of each page. Dismiss state saved in `localStorage`.

| Page | Pro Tip |
|---|---|
| **Dashboard** | "💡 **Pro Tip**: Check your dashboard every morning para updated ka sa overnight orders at messages!" |
| **Orders** | "💡 **Pro Tip**: Gamitin ang column manager para i-customize ang view mo. I-hide ang columns na hindi mo kailangan para mas malinis ang table." |
| **Chats** | "💡 **Pro Tip**: Press **Enter** para mag-send agad, **Shift+Enter** para sa new line. Mas mabilis ang reply mo!" |
| **Finance** | "💡 **Pro Tip**: I-log ang expenses mo daily para updated ang cash flow mo. Mas madaling mag-decide pag alam mo kung magkano ang pumapasok at lumalabas." |
| **Automations** | "💡 **Pro Tip**: Start with 3-5 automations for your most common customer questions. Pwede ka mag-add pa later!" |
| **Bot Flow** | "💡 **Pro Tip**: Test ang bot flow mo regularly by messaging your own bot. Mas madaling makita ang issues kung ikaw mismo ang nagte-test." |
| **FAQs** | "💡 **Pro Tip**: Add keywords na related sa question — halimbawa, for 'Magkano ang shipping?', add keywords like 'price, cost, shipping, delivery'." |
| **Quick Replies** | "💡 **Pro Tip**: Gumawa ng quick replies for your top 5 most common responses. Makakatipid ka ng oras sa every chat!" |
| **Tags** | "💡 **Pro Tip**: Use tags to segment customers — VIP customers can get special treatment, wholesale buyers can get bulk pricing info." |
| **Media** | "💡 **Pro Tip**: Use descriptive filenames like 'lavender-30ml.jpg' instead of 'IMG_1234.jpg' — mas madaling hanapin later!" |
| **Settings** | "💡 **Pro Tip**: Try setting your AI bot to 'Taglish' tone — mas natural ang dating sa Filipino customers at mas mataas ang engagement!" |

---

### 6D. Keyboard Shortcut Hints

| Shortcut | Action | Where to Show |
|---|---|---|
| `Ctrl + K` | Command palette | Layout footer / sidebar bottom |
| `Enter` | Send message | Chats reply box placeholder |
| `Shift + Enter` | New line in reply | Chats reply box tooltip |
| `Escape` | Close modal | All modals (implicit) |

**Suggested hint format**: Subtle `⌘K` badge in the sidebar footer or a small "Press Ctrl+K for quick access" hint.

---

## 7. FORM COPY IMPROVEMENTS

### Placeholders (More Helpful)

| Page | Field | Current Placeholder | Suggested |
|---|---|---|---|
| **Orders** | Customer name | "Customer name" | "e.g., Maria Santos" |
| **Orders** | Notes | "Optional notes..." | "e.g., Deliver before 5pm, gift wrap" |
| **Finance** | Description | "What was this for?" | "e.g., Bought 50ml bottles from supplier" |
| **Finance** | Category | "supplies, shipping, etc." | "e.g., supplies, shipping, packaging" |
| **FAQs** | Question | "What do customers ask?" | "e.g., Magkano ang shipping fee?" |
| **FAQs** | Answer | "Your answer..." | "e.g., ₱80 within Metro Manila, ₱150 provincial" |
| **FAQs** | Keywords | "price, cost, how much" | "e.g., shipping, delivery, fee, cost" |
| **Automations** | Trigger value | "hello, GET_STARTED" | "e.g., hi, hello, kamusta" |
| **Quick Replies** | Label | "Short name" | "e.g., Thank you, Available" |
| **Quick Replies** | Message | "Full message..." | "e.g., Salamat sa order mo! I-ship namin within 24 hours. 🧴" |
| **Bot Flow** | Step key | "ask_name" | "e.g., ask_scent, confirm_order" |
| **Bot Flow** | Prompt message | "What should the bot say?" | "e.g., Anong scent ang gusto mo? Meron kaming Lavender, Vanilla, at Jasmine." |
| **Tags** | Key | "vip" | "e.g., vip, wholesale, new_customer" |
| **Tags** | Label | "VIP Customer" | "e.g., VIP Customer, Wholesale Buyer" |
| **Settings** | Brand tagline | "Premium scents, delivered" | "e.g., Premium perfumes, abot-kaya presyo" |
| **Settings** | Welcome message | "Welcome to our store..." | "e.g., Hi! Welcome sa aming store. Ano ang maitutulong namin sa'yo today?" |
| **Settings** | AI system prompt | "You are a helpful assistant..." | "e.g., You are a friendly perfume shop assistant. Answer in Taglish. Be warm and helpful." |

---

## 8. BUTTON COPY IMPROVEMENTS

| Page | Current | Suggested | Context |
|---|---|---|---|
| **All** | "+ Add [Thing]" | "+ Add [Thing]" *(keep)* | Clear pattern |
| **Orders** | "+ New Order" | "+ New Order" *(keep)* | Clear |
| **Orders** | "Create Order" | "Create Order" *(keep)* | Clear |
| **Orders** | "Save Changes" | "Save Changes" *(keep)* | Clear |
| **Orders** | "Export" | "Export CSV 📄" | More specific |
| **Chats** | "Send" | "Send" *(keep)* | Clear |
| **Chats** | "Open" | "Open Chat →" | More descriptive |
| **Settings** | "Save Changes" | "Save Changes" *(keep)* | Clear |
| **All modals** | "Cancel" | "Cancel" *(keep)* | Standard |
| **All modals** | Delete confirm | "Yes, Delete" | Clear action |

---

## 9. SEARCH & FILTER PLACEHOLDERS

| Page | Current | Suggested |
|---|---|---|
| **Orders** | "Search orders..." | "Search by name, order #, or notes..." |
| **Chats** | "Search conversations..." | "Search by name or ID..." |
| **Command Palette** | *(check component)* | "Type a command or page name... (e.g., 'orders', 'settings')" |

---

## 10. SIDEBAR & NAVIGATION COPY

| Item | Current | Suggested | Notes |
|---|---|---|---|
| Brand | "PawPerfume" | "PawPerfume" *(keep)* | Core brand |
| Nav sections | "Main", "Content", "System" | "Main", "Content", "System" *(keep)* | Clear |
| Theme toggle | "Theme" | "Theme" *(keep)* | Clear |
| Logout | "Logout" | "Logout" *(keep)* | Standard |
| Sidebar tooltip (collapsed) | *(none)* | Add tooltips on hover: "Dashboard", "Chats", etc. | Accessibility |

---

## IMPLEMENTATION PRIORITY

### 🔴 High Priority (Biggest UX Impact)
1. **Replace native `confirm()` dialogs** — The browser confirm is jarring and unbranded. Build a reusable `<ConfirmDialog>` component with the copy from Section 3.
2. **Update all toast messages** — Quick wins across the board. Just update the string literals in each page's `showToast()` calls.
3. **Fix all error messages** — Replace "Failed to X" with helpful, reassuring messages from Section 5.

### 🟡 Medium Priority (Good UX Lift)
4. **Update empty states** — Add warmth, Taglish, and CTAs from Section 1. The Orders page is already decent; use it as the template.
5. **Add loading state text** — Replace generic "Loading..." with context-specific messages from Section 4.
6. **Improve form placeholders** — Use the examples from Section 7 to make forms more intuitive.

### 🟢 Lower Priority (Polish)
7. **Build onboarding flow** — Welcome modal + contextual tooltips from Section 6.
8. **Add pro tip banners** — Dismissible tips per page from Section 6C.
9. **Keyboard shortcut hints** — Subtle badges in the UI from Section 6D.

---

## APPENDIX: Reusable Components Needed

To implement this guide, create these shared components:

### 1. `<EmptyState>` Component
```svelte
<EmptyState
  icon="📦"
  headline="Wala pang orders — tara, mag-add na!"
  body="Dito mo i-track ang lahat ng sales mo."
  buttonText="+ Log Your First Order"
  onAction={newOrder}
/>
```

### 2. `<ConfirmDialog>` Component
```svelte
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Order #123?"
  body="Hindi mo na ma-undo ito, pero pwede ka mag-create ng bagong order anytime."
  cancelText="Cancel"
  confirmText="Yes, Delete"
  variant="danger"
  onConfirm={confirmDeleteOrder}
  onCancel={() => showDeleteConfirm = false}
/>
```

### 3. `<ProTip>` Component
```svelte
<ProTip id="orders-tip" message="Gamitin ang column manager para i-customize ang view mo." />
```

### 4. `<LoadingState>` Component
```svelte
<LoadingState message="Hinihila ang orders mo..." />
```

---

*Last updated: 2025*
*Maintained by: PawPerfume Product Team*
*Review quarterly — update copy based on user feedback and analytics.*
