# Production WhatsApp Business Chatbot (100% Free Stack)

An enterprise-ready, automated WhatsApp assistant designed for small businesses (restaurants, groceries, salons). Built strictly with **100% free-tier developer tools and APIs**: Node.js, Express, Meta WhatsApp Cloud API Free Sandbox, PostgreSQL on Neon (Free Tier) with Prisma ORM, Redis on Upstash (Free Tier), and hosted on Render (Free Web Service).

---

## 🏗️ Architecture & Project Structure

```text
├── .env.example                     # Environment variable template with all credentials
├── package.json                     # Express full-stack + Vite dependencies & scripts
├── server.ts                        # Express server entry point, raw body parser, SSE stream
├── prisma/
│   └── schema.prisma                # Prisma schema: Customer, Order, OrderItem, Message, Conversation
├── src/
│   ├── config/
│   │   └── index.ts                 # Central business profile (name, hours, 10 dishes) & env config
│   ├── controllers/
│   │   ├── admin.controller.ts      # Admin API: orders, status updates, broadcast, resume bot
│   │   ├── message.handler.ts       # WhatsApp state machine, keywords, language, opt-out, handoff
│   │   └── webhook.controller.ts    # GET verification & POST async processing with deduplication
│   ├── middleware/
│   │   ├── auth.middleware.ts       # X-Admin-Api-Key authentication for admin endpoints
│   │   └── signature.middleware.ts  # Meta X-Hub-Signature-256 HMAC-SHA256 signature verification
│   ├── locales/
│   │   ├── en.json                  # English messaging templates
│   │   ├── hi.json                  # Hindi messaging templates (हिंदी)
│   │   └── index.ts                 # Message lookup & variable interpolation
│   ├── routes/
│   │   ├── admin.routes.ts          # Express router for /api/admin/*
│   │   └── webhook.routes.ts        # Express router for /webhook
│   ├── services/
│   │   ├── broadcast.service.ts     # Rate-limited batch template sender for opted-in users
│   │   ├── db.service.ts            # PostgreSQL/Prisma database repository + in-memory fallback
│   │   ├── order.service.ts         # Order placement, customer summary, owner notification
│   │   ├── state.service.ts         # Upstash Redis state machine (30m TTL, back/cancel support)
│   │   └── whatsapp.service.ts      # Meta Cloud API client (text, list, buttons, template, backoff)
│   ├── utils/
│   │   ├── crypto.ts                # Timing-safe HMAC-SHA256 signature verifier & generator
│   │   └── logger.ts                # Structured JSON logging
│   ├── App.tsx                      # Web WhatsApp Simulator, Webhook Inspector & Admin Console
│   └── main.tsx                     # React client mount
```

---

## 🌟 Key Features

1. **Meta Webhook Verification & Processing**
   - `GET /webhook`: Verification challenge handshake using `VERIFY_TOKEN`.
   - `POST /webhook`: Validates `X-Hub-Signature-256` HMAC-SHA256, returns HTTP 200 immediately, and executes asynchronous processing.
   - **Idempotency**: Automatic message deduplication using Meta `wamid` IDs.

2. **Automated Conversational Assistant**
   - First-contact welcome message & automatic greeting after 24 hours of inactivity.
   - Keyword recognition: `hi`, `hello`, `menu`, `help`, `order`, `status`, `agent`, `stop`, `start`.
   - Friendly fallback prompt for unhandled inputs.

3. **Interactive WhatsApp Messages**
   - **Interactive List Message**: Main Menu (Services, Tracking, Hours, Language, Agent) and Menu Catalog (up to 10 dishes categorized).
   - **Interactive Reply Buttons**: Quick quantity selection (1, 2, 3), Order confirmation (`Confirm Order` / `Cancel`), and Language switcher (`English` / `हिंदी`).

4. **Conversation State Machine (Redis, 30-Minute TTL)**
   - States: `MAIN_MENU` ➔ `BROWSING` ➔ `SELECT_ITEM` ➔ `QUANTITY` ➔ `ADDRESS` ➔ `CONFIRM` ➔ `DONE`.
   - Step-by-step `back` navigation and global `cancel` at any point.

5. **Order Lifecycle & Owner Alerts**
   - Calculates totals, collects delivery address, and generates sequential order numbers (`ORD-1001`).
   - Immediately notifies the business owner's personal WhatsApp number (`OWNER_PHONE`) on every new order.

6. **Order Status Tracking & 24h Window Rule**
   - Admin changes order status (`PLACED` ➔ `PREPARING` ➔ `READY` ➔ `DELIVERED` ➔ `CANCELLED`).
   - Sends a free-form WhatsApp message inside the 24-hour window, or an approved WhatsApp Template message outside the 24-hour window.

7. **Human Handoff**
   - Customer typing `agent` pauses the automated bot for that user and flags staff.
   - Admin can resume the bot anytime via `POST /api/admin/resume-bot` or the admin console.

8. **Multi-Language Support**
   - Full English and Hindi (`hi.json`) localization; user switches via interactive button or typing `language`.

9. **Strict Opt-In / Opt-Out Compliance**
   - Typing `STOP` unsubscribes the user immediately. The bot never messages unsubscribed users.
   - Typing `START` re-subscribes.

10. **Rate-Limited Broadcasts**
    - `POST /api/admin/broadcast`: Sends template campaigns only to opted-in users with a 600ms delay between dispatches.

---

## 🗄️ Database & Prisma Migration Commands

### Prisma Schema (`prisma/schema.prisma`)
Contains five models:
- `Customer`: Phone (E.164), name, preferred language (`en`/`hi`), opt-in boolean.
- `Order`: Order number, status (`PLACED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`), total amount, delivery address.
- `OrderItem`: Item ID, dish name, price, quantity.
- `Message`: Meta `messageId` (for idempotency), direction (`INBOUND`/`OUTBOUND`), payload.
- `Conversation`: State machine position, `isBotPaused`, last interaction timestamp.

### Migration Commands
```bash
# Push schema directly to Neon PostgreSQL (Recommended for prototyping)
npx prisma db push

# Or create a formal migration history
npx prisma migrate dev --name init_whatsapp_bot

# Generate Prisma Client
npx prisma generate

# Inspect tables visually via Prisma Studio
npx prisma studio
```

---

## 🚀 Step-by-Step Setup Guide (100% Free Tools)

### Step 1: Meta Developer Account & WhatsApp Cloud API
1. Visit [developers.facebook.com](https://developers.facebook.com) and log in.
2. Click **My Apps** ➔ **Create App** ➔ Choose **Other** ➔ Select **Business**.
3. In App Dashboard, find **WhatsApp** and click **Set Up**.
4. Go to **WhatsApp ➔ API Setup**:
   - Copy your **Phone Number ID** (e.g., `109876543210987`).
   - Copy your **Temporary Access Token** (valid 24h for initial tests).
   - Under **Send and receive messages**, locate the **To** field, click **Manage phone number list**, and add your personal WhatsApp number (up to 5 test numbers in free sandbox; requires SMS verification code).
5. **Get a Permanent Token (System User)**:
   - Go to [business.facebook.com/settings](https://business.facebook.com/settings) ➔ **System Users**.
   - Click **Add** ➔ Name: `WhatsAppBotAdmin` ➔ Role: **Admin**.
   - Click **Add Assets** ➔ Select your WhatsApp Account ➔ Toggle **Full Control**.
   - Click **Generate New Token** ➔ Select permissions: `whatsapp_business_messaging` and `whatsapp_business_management`.
   - Copy this permanent token into your `.env` as `WHATSAPP_TOKEN`.

### Step 2: Run Locally & Tunnel with ngrok
1. Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. In another terminal, start free ngrok:
   ```bash
   ngrok http 3000
   ```
4. Copy your forwarding URL (e.g., `https://abc-123.ngrok-free.app`).
5. In Meta Developer Console ➔ **WhatsApp** ➔ **Configuration**:
   - **Callback URL**: `https://abc-123.ngrok-free.app/webhook`
   - **Verify Token**: Match `VERIFY_TOKEN` from your `.env` (default: `my_secure_webhook_verify_token_2026`).
   - Click **Verify and Save**.
   - Under **Webhook Fields**, click **Manage** and subscribe to **`messages`**.

### Step 3: Create Free Neon PostgreSQL Database
1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Click **Create Project** ➔ Name: `whatsapp-bot-db`.
3. In the Connection Details panel, select **Prisma** or **Node.js** and copy the connection string.
4. Paste it into your `.env`:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-cool-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
5. Run `npx prisma db push`.

### Step 4: Create Free Upstash Redis Database
1. Go to [upstash.com](https://upstash.com) and create a free account.
2. Click **Create Database** ➔ Type: **Redis** ➔ Free Tier (10,000 commands/day).
3. Copy the `rediss://...` connection string.
4. Paste it into your `.env`:
   ```env
   REDIS_URL="rediss://default:password@us1-quick-12345.upstash.io:6379"
   ```

### Step 5: Free Deployment to Render
1. Push your repository to GitHub.
2. Go to [render.com](https://render.com) ➔ Click **New +** ➔ **Web Service**.
3. Connect your repository:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. In the **Environment Variables** tab, add:
   - `PORT`: `3000`
   - `WHATSAPP_TOKEN`: `<your_meta_token>`
   - `PHONE_NUMBER_ID`: `<your_phone_number_id>`
   - `VERIFY_TOKEN`: `<your_verify_token>`
   - `APP_SECRET`: `<your_meta_app_secret>`
   - `OWNER_PHONE`: `<your_phone_with_country_code>`
   - `ADMIN_API_KEY`: `<your_admin_secret>`
   - `DATABASE_URL`: `<neon_postgres_url>`
   - `REDIS_URL`: `<upstash_redis_url>`
5. Deploy the service. Your live URL will be `https://<service-name>.onrender.com`.
6. Update Meta Webhook configuration to:
   - Callback URL: `https://<service-name>.onrender.com/webhook`
7. **Keep-Alive (Prevent Cold Sleeps)**:
   - Free Render services sleep after 15 minutes of inactivity.
   - Use a free monitoring service like [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org).
   - Set up an HTTP check pinging `https://<service-name>.onrender.com/health` every 10 minutes.

---

## 📋 Sample Meta WhatsApp API Payloads

### 1. Inbound Text Message (`POST /webhook`)
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "109876543210987",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550293421",
              "phone_number_id": "109876543210987"
            },
            "contacts": [
              {
                "profile": { "name": "Tushar" },
                "wa_id": "919876543210"
              }
            ],
            "messages": [
              {
                "from": "919876543210",
                "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhggMTIzNDU2Nzg5MAA=",
                "timestamp": "1728739200",
                "type": "text",
                "text": { "body": "hi" }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### 2. Inbound Interactive List Selection Reply
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "109876543210987",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "contacts": [{ "profile": { "name": "Tushar" }, "wa_id": "919876543210" }],
            "messages": [
              {
                "from": "919876543210",
                "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhggOTg3NjU0MzIxMAA=",
                "timestamp": "1728739250",
                "type": "interactive",
                "interactive": {
                  "type": "list_reply",
                  "list_reply": {
                    "id": "item_dish_01",
                    "title": "Butter Chicken (₹380)",
                    "description": "Tender chicken in rich creamy tomato cashew gravy"
                  }
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### 3. Outgoing WhatsApp Interactive List Message
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "Main Menu" },
    "body": { "text": "Please select what you would like to do:" },
    "action": {
      "button": "View Options",
      "sections": [
        {
          "title": "Services & Orders",
          "rows": [
            {
              "id": "action_order_now",
              "title": "🛍️ Order Now",
              "description": "Browse dishes and place an order"
            },
            {
              "id": "action_track_order",
              "title": "📍 Track Order",
              "description": "Check live status of your order"
            }
          ]
        }
      ]
    }
  }
}
```

### 4. Outgoing WhatsApp Interactive Reply Buttons (Max 3)
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": { "text": "Please confirm your order for 2x Butter Chicken (₹760):" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "confirm_order_yes", "title": "✅ Confirm Order" } },
        { "type": "reply", "reply": { "id": "confirm_order_no", "title": "❌ Cancel" } }
      ]
    }
  }
}
```

### 5. Outgoing WhatsApp Template Message (Outside 24h Window)
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "order_status_update",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "ORD-1001" },
          { "type": "text", "text": "DELIVERED" }
        ]
      }
    ]
  }
}
```

---

## 🧪 Comprehensive Test Plan

| Test Case | Inbound Message | Expected Bot Behavior |
|---|---|---|
| **TC-01: Welcome Greeting** | `hi` or `hello` | Sends welcome greeting and WhatsApp List with 5 main menu options. |
| **TC-02: Browse Catalog** | Selects `Order Now` | Returns 10 dishes grouped into sections with prices. |
| **TC-03: Quantity Selection** | Selects `Butter Chicken` | Asks for quantity with quick reply buttons `1`, `2`, `3`. |
| **TC-04: Address Collection** | Clicks `2` | Prompts for street delivery address and calculates total (₹760). |
| **TC-05: Order Confirmation** | Enters delivery address | Displays order summary; prompts `Confirm Order` / `Cancel`. |
| **TC-06: Order Placement & Owner Alert** | Clicks `Confirm Order` | Generates `#ORD-1002`, confirms to customer, and alerts `OWNER_PHONE`. |
| **TC-07: Track Order** | `status` or `track` | Displays recent order number, status (`PLACED`), and items. |
| **TC-08: Admin Status Update** | Admin updates status to `PREPARING` | Dispatches status update notification directly to customer on WhatsApp. |
| **TC-09: Human Handoff** | `agent` | Pauses bot, confirms to user, alerts staff. Bot stops auto-replying. |
| **TC-10: Resume Bot** | Admin calls `/api/admin/resume-bot` | Bot resumes and responds to user messages. |
| **TC-11: Hindi Language Switch** | `language` ➔ clicks `हिंदी` | Switches language to Hindi; subsequent messages are in Hindi. |
| **TC-12: Opt-Out Compliance** | `STOP` | Sets `optedIn = false`. Confirms unsubscribe. Bot goes silent on further messages. |
| **TC-13: Re-Opt-In** | `START` | Sets `optedIn = true`. Re-enables messaging and sends welcome back. |
| **TC-14: State Rollback** | `back` or `cancel` | Resets to previous state or returns to `MAIN_MENU`. |
| **TC-15: Rate-Limited Broadcast** | Admin triggers broadcast | Dispatches template to opted-in users with a 600ms delay between sends. |
