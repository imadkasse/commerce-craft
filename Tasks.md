# ظ‹ع؛ع‘â‚¬ CommerceCraft ‌ Milestones & Tasks

> Actionable task breakdown for building the CommerceCraft AI-powered e-commerce platform.
> Each milestone builds on the previous one. Complete them in order.

---

## Milestone 1 ‌ Project Foundation & Tooling

> Set up the core project infrastructure: database, ORM, UI library, state management, and shared utilities.

### Tasks

- [ ] Install and configure **Drizzle ORM** with PostgreSQL (Neon) connection
- [ ] Create `drizzle.config.ts` at project root
- [ ] Set up database client wrapper in `src/lib/db/index.ts`
- [ ] Design and create the **full database schema** (all tables: users, stores, products, product_variants, product_colors, product_sizes, orders, order_items, landing_pages, team_members, etc.)
- [ ] Run initial database migration
- [ ] Install and initialize **shadcn/ui** with Tailwind CSS v4
- [ ] Set up the `src/components/ui/` directory with base shadcn components (Button, Input, Card, Dialog, Table, Badge, Select, Tabs, Form, Sheet, DropdownMenu, Avatar, Tooltip, Separator, Skeleton, Toast)
- [ ] Install **Zustand** and create base stores in `src/store/`
- [ ] Create shared layout components: `Navbar`, `Sidebar`, `DashboardShell` in `src/components/shared/`
- [ ] Set up the `(dashboard)` route group with a protected layout
- [ ] Set up the `(auth)` route group with a login layout
- [ ] Configure environment variables (`.env.local`): DATABASE_URL, JWT_SECRET, etc.
- [ ] Set up API route handler structure under `src/app/api/`

---

## Milestone 2 ‌ Authentication & Team RBAC

> Implement secure login, JWT-based sessions, and role-based access control.

### Tasks

- [ ] Create `users` table with roles (SUPERADMIN, ADMIN)
- [ ] Create `team_members` and `stores` tables for multi-tenant support
- [ ] Implement **login** endpoint (POST `/api/auth/login`) with JWT token generation
- [ ] Implement **logout** endpoint and client-side token clearing
- [ ] Create auth middleware to protect dashboard routes and API routes
- [ ] Build the **Login page** UI at `(auth)/login/page.tsx`
- [ ] Create a Zustand auth store for client-side session state
- [ ] Implement role-based middleware: SUPERADMIN (system-wide) vs ADMIN (store-level)
- [ ] Build **Team Management** page at `(dashboard)/team/page.tsx` (only for SUPERADMIN users)
  - [ ] Invite/remove team members
  - [ ] Assign and change roles
  - [ ] View team activity
- [ ] Create API routes for team CRUD (`/api/team`)

---

## Milestone 3 ‌ Store Manager

> Allow merchants to configure their store settings and public-facing identity.

### Tasks

- [x] Create the `stores` table with fields: name, slug, domain, theme, logo, settings
- [x] Build **Store Settings** page at `(dashboard)/store/page.tsx`
- [x] Implement store profile editing (name, description, logo, contact info)
- [x] Implement UI theme customization (primary color, font, layout style)
- [x] Implement custom domain mapping and slug management
- [x] Create public store route handler for rendering landing pages by domain/slug
- [x] Create API routes for store CRUD (`/api/store`)

---

## Milestone 4 ‌ Products Management (with Product Type Selector)

> Full product catalog with support for **Clothing** (colors + sizes + stock matrix) and **General** products.

### Tasks

- [x] Create `products` table: name, description, slug, **type** (`CLOTHING` | `GENERAL`), price, images, tags, store_id
- [x] Create `product_variants` table for general variant support
- [x] Create `product_colors` table: product_id, name, hex_code, stock_quantity
- [x] Create `product_sizes` table: product_id, color_id, size_label, stock_quantity
- [x] Build **Products List** page at `(dashboard)/products/page.tsx` with data table, search, and filters
- [x] Build **Create Product** form at `(dashboard)/products/new/page.tsx`
  - [x] Add **Product Type Selector** (radio/toggle): `Clothing` vs `Other/General`
  - [x] **If Clothing selected أ¢â€ â€™** show dynamic sections:
    - [x] Add Colors section (color picker + name + stock per color)
    - [x] Add Sizes per color (S, M, L, XL, XXL, custom) with stock input per sizeط£â€”color
    - [x] Stock matrix/summary table showing all color ط£â€” size combinations and totals
  - [x] **If General selected أ¢â€ â€™** show standard single stock quantity input
- [x] Build **Edit Product** form at `(dashboard)/products/[id]/edit/page.tsx` with same type-aware logic
- [x] Implement product image upload (Cloudinary or direct URL)
- [x] Create product CRUD API routes (`/api/products`)
- [x] Create product colors CRUD API (`/api/products/[id]/colors`)
- [x] Create product sizes CRUD API (`/api/products/[id]/sizes`)
- [x] Add product deletion with confirmation dialog
- [x] Link products to landing pages via foreign key

---

## Milestone 5 ‌ Dashboard & Analytics

> Visual overview of store performance with metrics and activity feeds.

### Tasks

- [x] Build **Dashboard** home page at `(dashboard)/page.tsx`
- [x] Create analytics cards: total sales, active landing pages, conversion rate, revenue
- [x] Create a recent orders widget/table
- [x] Create a system activity feed (team logs, page generation statuses)
- [x] Build chart components for sales over time (bar chart, line chart)
- [x] Create dashboard data aggregation API routes (`/api/dashboard/stats`)

---

## Milestone 6 ‌ Orders Management

> Full order lifecycle management with filtering, status updates, and export preparation.

### Tasks

- [x] Create `orders` table: customer_name, phone, address, status, tracking_code, total, store_id, etc.
- [x] Create `order_items` table for multi-item orders
- [x] Build **Orders List** page at `(dashboard)/orders/page.tsx` with data table
  - [x] Filter by status, date range, customer
  - [x] Search by customer name, phone, order ID
- [x] Build **Order Detail** page at `(dashboard)/orders/[id]/page.tsx`
- [x] Implement order status flow: pending ? confirmed ? shipped ? delivered / cancelled
- [x] Create order CRUD API routes (`/api/orders`)
- [x] Implement order status update API with validation
- [x] Add order statistics summary (total, pending, shipped, delivered, cancelled)

---

## Milestone 7 ‌ Google Sheets Integration

> Sync orders to Google Sheets for external tracking and reporting.

### Tasks

- [x] Set up Google Sheets API credentials (OAuth2 / Service Account)
- [x] Create Google Sheets service wrapper in `src/lib/services/google-sheets.ts`
- [x] Build **Sheets Export Settings** page at `(dashboard)/orders/sheets-config/page.tsx`
  - [x] Connect/link a Google Sheet (spreadsheet ID + sheet name)
  - [x] Configure field mapping (Customer Name, Phone, Address, Product, Quantity, Order Total, Tracking Code)
- [x] Implement one-click export: push selected/all orders to Google Sheets
- [x] Implement automated background sync (export new orders on status change)
- [x] Create API routes for sheets sync (`/api/sheets/sync`, `/api/sheets/config`)
- [x] Add sync status indicator in orders page UI

---

## Milestone 8 ‌ AI Landing Page Generator (Gemini & HTML/Tailwind)

> Generate high-converting HTML + Tailwind product landing pages with marketing angles and unified checkout forms using AI.

### Tasks

- [x] Set up Gemini API client wrapper in `src/lib/ai/gemini.ts`
- [x] Create `landing_pages` table: `id`, `slug`, `product_id`, `generated_html`, `status` (draft | published), `customizations` (JSON)
- [x] Build **Prompt-to-Page Pipeline**:
  - [x] Fetch product data from DB (`product_id`)
  - [x] Pass product metadata + selected marketing angles to Gemini API
  - [x] Generate structured HTML/Tailwind UI (Hero section, marketing angles cards, feature list, and guarantees)
- [x] Build **Unified Checkout Form Component** (Embedded in generated HTML or dynamic React component):
  - [x] Full Name & Phone Number fields
  - [x] Wilaya & Baladiya dynamic selectors
  - [x] Delivery company selection (e.g., Home delivery vs. Desk pickup)
  - [x] Price breakdown display (Product Price + Shipping Cost + Total)
  - [x] Product options/details recap
- [x] Build **Landing Pages Management List** at `(dashboard)/landing-pages/page.tsx`
- [x] Build **Landing Page Editor & Live Preview** at `(dashboard)/landing-pages/[slug]/page.tsx`:
  - [x] Live preview of generated HTML/Tailwind template
  - [x] Inline quick-edit for copy, headlines, and marketing angles
  - [x] Simple UI customization panel (colors, typography, form button styles)
- [x] Implement Page Publish / Unpublish flow
- [x] Create API route for page generation (`/api/ai/generate-page`)
- [x] Create API route for landing page CRUD operations (`/api/landing-pages`)
- [x] Create API route for public checkout order submission (`/api/orders/checkout`)
- [x] Implement Public Landing Page rendering route at `/p/[slug]`

---

## Milestone 9 ‌ AI Image Editor (Nano Banana)

> Integrate AI-powered image manipulation for product photos.

### Tasks

- [ ] Set up Nano Banana (Inpainting) API client wrapper in `src/lib/ai/nano-banana.ts`
- [ ] Build image editor UI component in `src/components/ai-editor/`
  - [ ] Background removal tool
  - [ ] Image enhancement / upscaling
  - [ ] Simple inpainting (remove objects, fill areas)
- [ ] Integrate image editor into product creation/editing flow
- [ ] Integrate image editor into landing page editor
- [ ] Create API routes for image processing (`/api/ai/edit-image`)
- [ ] Add image upload أ¢â€ â€™ edit أ¢â€ â€™ save pipeline with preview

---

## Milestone 10 ‌ Logistics & Delivery Integrations

> Connect with local shipping providers for order fulfillment and label generation.

### Tasks

- [x] Create shipping service wrappers in `src/lib/services/shipping/`
  - [x] ZR Express integration
  - [x] Yalidin integration
  - [x] NOEST Express integration
  - [x] Generic provider interface for future additions
- [x] Build **Shipping Settings** page at `(dashboard)/store/shipping/page.tsx`
  - [x] Configure API keys per provider
  - [x] Set default provider
  - [x] Set shipping rates / zones
- [x] Implement one-click label generation from order detail page
- [x] Implement tracking code auto-fill on order after dispatch
- [x] Implement delivery status webhook receivers (`/api/webhooks/shipping/[provider]`)
- [x] Add shipping label download / print functionality
- [x] Create shipping API routes (`/api/shipping/dispatch`, `/api/shipping/tracking`)

---

## Milestone 11 ‌ Product Type Enhancements & UX Polish

> Refine the clothing/general product type feature, add advanced variant management, and polish the UX.

### Tasks

- [ ] Add product type filter in the products list page (filter by Clothing / General)
- [ ] Add a visual stock summary dashboard for clothing products (total stock across all colorط£â€”size combos)
- [ ] Add low-stock alerts / indicators for clothing variants
- [ ] Implement bulk stock update for color/size variants
- [ ] Add preset size templates (e.g., "Standard: XS-XL", "Extended: XS-3XL", "Kids: 2-12Y")
- [ ] Add color swatch previews in product list and detail views
- [ ] Add product variant quick-edit modal (inline editing without full form reload)
- [ ] Ensure responsive design across all product management screens
- [ ] Add loading states and skeleton screens for all pages
- [ ] Add toast notifications for all CRUD operations
- [ ] Add confirmation dialogs for destructive actions (delete product, cancel order)

---

## Milestone 12 ‌ Final Integration, Testing & Deployment

> Bring everything together, verify all integrations, and prepare for production.

### Tasks

- [ ] End-to-end flow: create product (both types) أ¢â€ â€™ generate landing page أ¢â€ â€™ receive order أ¢â€ â€™ export to Sheets أ¢â€ â€™ ship
- [ ] Test authentication flows (register, login, role enforcement, session expiry)
- [ ] Test role-based access: SUPERADMIN sees everything, ADMIN sees only their store
- [ ] Verify all API routes have proper error handling and input validation
- [ ] Verify database migrations are clean and reversible
- [ ] Set up environment variable documentation (`.env.example`)
- [ ] Configure production database (Neon) and run migrations
- [ ] Configure Cloudinary / S3 for production image storage
- [ ] Set up Google Sheets OAuth for production
- [ ] Configure shipping API production credentials
- [ ] Performance audit: optimize queries, add indexes, lazy-load heavy components
- [ ] SEO: add metadata to public landing pages
- [ ] Deploy to Vercel (or preferred hosting platform)
- [ ] Post-deployment verification: smoke test all critical paths

---



# Milestone 13 Multi-Store Engine & Customizer

> Allow merchants to create and manage multiple stores, customize appearance via metadata (`theme`), check subdomain availability, preview live edits in a playground, and publish under custom subdomains.

### Tasks

- [ ] Build **Multi-Store Management** page to list all owned stores and create new ones
- [ ] Implement store creation form using `stores` schema (`name`, `slug`, `description`, `logoUrl`, `theme`)
- [ ] Create **Store Customizer / Playground** page at `(dashboard)/stores/[id]/playground/page.tsx`
- [ ] Implement live preview editor for updating `theme` JSONB properties (`primaryColor`, `font`, `layout`)
- [ ] Implement dynamic storefront rendering driven by `theme` metadata (Navbar, Categories, Product Grid, Cart)
- [ ] Build subdomain availability check API endpoint (`/api/stores/check-domain`)
- [ ] Implement dynamic subdomain middleware and routing (`{slug}.store.example.com`)
- [ ] Implement store publishing flow and subdomain mapping

## Milestone Summary

| #   | Milestone                             | Key Deliverable                                                         |
| :-- | :------------------------------------ | :---------------------------------------------------------------------- |
| 1   | Project Foundation & Tooling          | DB, ORM, shadcn/ui, Zustand, layout scaffolding                         |
| 2   | Authentication & Team RBAC            | Login, JWT auth, role-based access, team management                     |
| 3   | Store Manager                         | Store settings, themes, custom domains                                  |
| 4   | Products Management                   | Full CRUD with Clothing type (colors/sizes/stock matrix) & General type |
| 5   | Dashboard & Analytics                 | Visual metrics, activity feed, charts                                   |
| 6   | Orders Management                     | Order lifecycle, filtering, status updates                              |
| 7   | Google Sheets Integration             | One-click & automated order export to Sheets                            |
| 8   | AI Landing Page Generator             | Gemini-powered page generation with live editor                         |
| 9   | AI Image Editor                       | Nano Banana integration for photo editing                               |
| 10  | Logistics & Delivery                  | Shipping API integrations, label generation, tracking                   |
| 11  | Product Type Enhancements & UX Polish | Advanced variant UX, alerts, responsive polish                          |
| 12  | Final Integration & Deployment        | E2E testing, production config, deployment                              |
