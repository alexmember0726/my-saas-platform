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

- **Framework:** [Next.js 13+](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via [Prisma](https://prisma.io))
- **Auth:** [next-auth](https://next-auth.js.org/) or custom session-based
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
