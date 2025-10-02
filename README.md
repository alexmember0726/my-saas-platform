# My SaaS Platform

A full-stack SaaS starter built with **Next.js 13+ (App Router)**, **TypeScript**, **Prisma**, and **TailwindCSS**.

Includes:
- 🔑 Email/password authentication (sign-up, sign-in, sign-out)
- 🏢 Organizations & Projects management
- 🔐 Secure API key generation, rotation, and revocation
- 🌐 Allowed domain enforcement
- 📡 Event Tracking API (`/api/track`) with rate limiting
- 📊 Dashboard with simple analytics (event counts, charts)
- ✅ Automated tests (unit, integration, E2E)
- 🚀 CI/CD pipeline with GitHub Actions + Vercel deployment

---

## 📦 Tech Stack

- **Framework:** Next.js 13+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma)
- **Auth:** next-auth or custom session-based
- **Styling:** TailwindCSS + shadcn/ui
- **Validation:** Zod
- **Rate Limiting:** Upstash Redis or custom implementation
- **Testing:** Jest, React Testing Library, Playwright/Cypress
- **CI/CD:** GitHub Actions + Vercel

---

## 🚀 Getting Started

### 1️⃣ Clone & Install
```bash
git clone https://github.com/alexmember0726/my-saas-platform.git
cd my-saas-platform
npm install
```

### 2️⃣ Environment Variables
Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://user:password@host:port/dbName?schema=public"
WEBHOOK_SECRET_KEY="whsec_somerandomhighsecuritystring1234567890abcdef"
NEXTAUTH_SECRET="dev-secret"
```

### 3️⃣ Database Migration
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4️⃣ Run Test
```bash
npm run test
```

### 5️⃣ Run Dev Mode
```bash
npm run dev
```

### 6️⃣ Build and run product mode
```bash
npm run build
npm start
```

---

## 🧩 Design Choices & Tradeoffs

- Authentication: bcrypt-hashed passwords, session handled via next-auth or custom middleware
- Project API Keys: Long-lived hashed keys, short-lived JWT tokens derived from them
- Event Tracking: /api/track validates short-lived tokens, allowed domains, rate limits
- Webhooks: HMAC signature validation, raw body required, quick 200/202 responses
- Tradeoffs: In-memory rate limiting for demo; Redis recommended in production. Short-lived tokens signed with server secret, not project key.

---

## 🔗 API Flows

### Event Tracking Flow (`/api/track`)

1. Generate short-lived token via `/api/token-exchange` using Api key and Secrte key with `Authorization: Basic base64(API_KEY:SECRET_KEY)`
2. Call `/api/track` with `Authorization: Bearer <short-lived token>`
3. Server validates token, domain, rate-limit, then stores event in DB

### Webhook Flow (`/api/webhooks`)

- Incoming webhook validated via HMAC signature
- Example receiver and sender code available here
```
const crypto = require("crypto");
const axios = require("axios");

const WEBHOOK_SECRET = "whsec_somerandomhighsecuritystring1234567890abcdef";
const WEBHOOK_URL = "http://localhost:3000/api/webhook";

const payload = { type: "user.signup", data: { email: "user@example.com" } };
const RAW_PAYLOAD = JSON.stringify(payload);

function calculateHmacSignature(rawBody, secret) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody, "utf8");
    return hmac.digest("hex");
}

async function sendSignedWebhook() {
    const signature = calculateHmacSignature(RAW_PAYLOAD, WEBHOOK_SECRET);
    const headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature": signature,
    };

    try {
        const response = await axios.post(WEBHOOK_URL, RAW_PAYLOAD, { headers });
        console.log("Receiver Response:", response.data);
    } catch (error) {
        console.error("Webhook failed:", error.response.data);
    }
}

sendSignedWebhook();
```

---
