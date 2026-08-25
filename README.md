# Slimdose

E-commerce storefront and admin console for research-grade peptides. Built as a single-page React + TypeScript app fully dedicated to Firebase.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router 7
- **Backend:** Google Firebase (Cloud Firestore, Firebase Authentication, Firebase Storage, Firebase Hosting)
- **Icons / UI:** lucide-react, qrcode.react
- **Analytics:** PostHog
- **Deploy:** Firebase Hosting (`firebase.json` included)

## Features

**Storefront**
- Product catalog with categories, search, and variations (per-size pricing/stock)
- Product detail pages with scientific data (purity, MW, CAS, sequence, storage)
- Cart, checkout, and order tracking
- Global discount + per-variation discounts + promo codes
- Bundle tier pricing
- Certificates of Analysis (COA) and FAQ pages
- Peptide reconstitution calculator
- Article/guide system with topic taxonomy
- Promo signup, floating cart, mobile nav

**Admin (`/admin`)**
- Products, variations, categories, inventory
- Orders management
- Payment methods, shipping locations, site settings
- Global discount and promo code managers
- COA, FAQ, and guide/article editors
- Sales analytics

## Project layout

```
src/
├── components/      # All UI — storefront + admin panels
├── hooks/           # Data hooks (useMenu, useCart, useSiteSettings, …)
├── lib/             # Firebase SDK client, adapters, and shared services
├── types/           # Shared TypeScript types
├── utils/           # Helpers
└── App.tsx          # Router and top-level layout

scripts/             # One-off maintenance scripts
public/              # Static assets
```

## Setup

Prereqs: Node 18+, a Firebase project (`slimdose-peptides`).

```bash
npm install
```

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Apply migrations from `supabase/migrations/` to your Supabase project (CLI or dashboard), then:

```bash
npm run dev      # http://localhost:5173
```

Admin lives at `/admin`.

## Scripts

| Command         | What it does                  |
| --------------- | ----------------------------- |
| `npm run dev`     | Start Vite dev server         |
| `npm run build`   | Production build to `dist/`   |
| `npm run preview` | Serve the production build    |
| `npm run lint`    | Run ESLint                    |

## Integrations

- **Telegram bot** — see `TELEGRAM_BOT_SETUP.md`
- **WhatsApp** — see `WHATSAPP_SETUP.md`

## Deploy

Push to Vercel; `vercel.json` is already configured. For any other host, run `npm run build` and serve `dist/`.

## Legal

Products are listed for research use only and not for human consumption. Make sure your sales operation complies with local law before going live.
