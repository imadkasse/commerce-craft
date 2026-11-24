<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🚀 CommerceCraft

**CommerceCraft** is an all-in-one AI-powered e-commerce management platform designed for merchants. It streamlines product management, automates AI landing page creation (complete with image editing and code generation), tracks and exports orders, syncs with Google Sheets, and integrates seamlessly with local shipping/delivery companies.

---

## 🛠️ Tech Stack & System Architecture

| Layer                | Technology / Tool                                                                 | Usage Details                                                                                                                |
| :------------------- | :-------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **Framework**        | **Next.js (App Router)**                                                          | Full-stack React framework utilizing Server Actions & Route Handlers.                                                        |
| **Styling & UI**     | **Tailwind CSS + shadcn/ui**                                                      | Clean, accessible, and responsive UI components.                                                                             |
| **State Management** | **Zustand**                                                                       | Lightweight client-side global state management.                                                                             |
| **Database**         | **PostgreSQL (Neon)**                                                             | Serverless Postgres database host.                                                                                           |
| **Database ORM**     | **Drizzle ORM** or **Prisma**                                                     | Type-safe SQL query builder and schema management.                                                                           |
| **Authentication**   | **Custom JWT**                                                                    | Secure, role-based access control (Admin & Super Admin).                                                                     |
| **AI Processing**    | **Gemini API & Nano Banana**                                                      | • **Gemini API:** Generates structured UI code & copy.<br>• **Nano Banana (Inpainting):** Edits and enhances product photos. |
| **Integrations**     | **Google Sheets API & Shipping APIs(ZR Express,Yalidin , NOEST Express ,...etc)** | Real-time order sync/export and automated delivery label generation.                                                         |
| **Storage & CDN**    | **Cloudinary / AWS S3**                                                           | Image storage fallback to direct URLs when preferred.                                                                        |

---

## 🏗️ Core Modules & Workflows

### 1. 📊 Dashboard Module

- **Analytics Overview:** Visual metrics for total sales, active landing pages, conversion rates, and revenue.
- **System Activity:** Recent orders, team logs, and page generation statuses.

### 2. 📦 Products Management

- Full CRUD operations for product catalogs (Variants, Pricing, Inventory, Tags).
- Direct linking between Products and generated Landing Pages.

### 3. 🛍️ Orders Management & Google Sheets Sync

- **Order Pipeline:** View, filter, and update customer order statuses (Pending, Confirmed, Shipped, Delivered, Cancelled).
- **Automated Google Sheets Sync:**
  - One-click or automated background export of new orders directly to specified Google Sheets.
  - Custom field mapping (Customer Name, Phone, Address, Product, Quantity, Order Total, Tracking Code).
- **Fulfillment Integration:** One-click dispatch to local delivery company APIs to generate shipping labels.

### 4. 🎨 AI Landing Page Generator

- **Prompt to Page Pipeline:** Takes product metadata and generates custom React/Tailwind sections via Gemini API.
- **AI Image Editor:** Integrated image manipulation (background removal, enhancement) using Nano Banana.
- **Live Preview & Customization:** Interactive UI editor to tweak AI-generated sections before publishing.

### 5. 🏪 Store Manager

- Customizable UI themes and store settings.
- Custom domain mapping and public route handling for generated landing pages.

### 6. 🚚 Logistics & Delivery Integrations

- Connects with local shipping provider APIs for order fulfillment, tracking label creation, and delivery updates.

### 7. 👥 Team & RBAC (Role-Based Access Control)

- Multi-tenant team management.
- Granular permissions for **SUPERADMIN** (System-wide access) and **ADMIN** (Store-level management).

---

## 📁 Proposed Project Structure

````text
commercecraft/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login & Auth routes
│   │   ├── (dashboard)/        # Admin & SuperAdmin dashboard
│   │   │   ├── orders/         # Orders table & Google Sheets export settings
│   │   │   ├── products/
│   │   │   ├── landing-pages/:slug
│   │   │   ├── store/
│   │   │   └── team/
│   │   └── api/                # Route Handlers (AI, External Webhooks, Shipping, Sheets Sync)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitive components
│   │   ├── orders/             # Order status badges, export modals, filter bars
│   │   ├── ai-editor/          # Canvas & live edit components
│   │   └── shared/             # Tables, Modals, Navbars
│   ├── lib/
│   │   ├── ai/                 # Gemini & Nano Banana client wrappers
│   │   ├── db/                 # Drizzle/Prisma schema and client connection
│   │   └── services/           # APIs calls and Database operations(read , write ...etc)
│   └── store/                  # Zustand global stores
├── public/
├── drizzle.config.ts           # DB migration & ORM settings
└── next.config.ts

**CommerceCraft** is an all-in-one AI-powered e-commerce management platform designed for merchants. It streamlines product management, automates AI landing page creation (complete with image editing and code generation), tracks and exports orders, syncs with Google Sheets, and integrates seamlessly with local shipping/delivery companies.

---

## 🛠️ Tech Stack & System Architecture

| Layer | Technology / Tool | Usage Details |
| :--- | :--- | :--- |
| **Framework** | **Next.js (App Router)** | Full-stack React framework utilizing Server Actions & Route Handlers. |
| **Styling & UI** | **Tailwind CSS + shadcn/ui** | Clean, accessible, and responsive UI components. |
| **State Management** | **Zustand** | Lightweight client-side global state management. |
| **Database** | **PostgreSQL (Neon)** | Serverless Postgres database host. |
| **Database ORM** | **Drizzle ORM** *(Recommended)* or **Prisma** | Type-safe SQL query builder and schema management. |
| **Authentication** | **Custom JWT / NextAuth** | Secure, role-based access control (Admin & Super Admin). |
| **AI Processing** | **Gemini API & Nano Banana** | • **Gemini API:** Generates structured UI code & copy.<br>• **Nano Banana (Inpainting):** Edits and enhances product photos. |
| **Integrations** | **Google Sheets API & Shipping APIs** | Real-time order sync/export and automated delivery label generation. |
| **Storage & CDN** | **Cloudinary / AWS S3** | Image storage fallback to direct URLs when preferred. |

---

## 🏗️ Core Modules & Workflows

### 1. 📊 Dashboard Module
- **Analytics Overview:** Visual metrics for total sales, active landing pages, conversion rates, and revenue.
- **System Activity:** Recent orders, team logs, and page generation statuses.

### 2. 📦 Products Management
- Full CRUD operations for product catalogs (Variants, Pricing, Inventory, Tags).
- Direct linking between Products and generated Landing Pages.

### 3. 🛍️ Orders Management & Google Sheets Sync
- **Order Pipeline:** View, filter, and update customer order statuses (Pending, Confirmed, Shipped, Delivered, Cancelled).
- **Automated Google Sheets Sync:**
  - One-click or automated background export of new orders directly to specified Google Sheets.
  - Custom field mapping (Customer Name, Phone, Address, Product, Quantity, Order Total, Tracking Code).
- **Fulfillment Integration:** One-click dispatch to local delivery company APIs to generate shipping labels.

### 4. 🎨 AI Landing Page Generator
- **Prompt to Page Pipeline:** Takes product metadata and generates custom React/Tailwind sections via Gemini API.
- **AI Image Editor:** Integrated image manipulation (background removal, enhancement) using Nano Banana.
- **Live Preview & Customization:** Interactive UI editor to tweak AI-generated sections before publishing.

### 5. 🏪 Store Manager (Prfere to use lib like :grapesjs)
- Customizable UI themes and store settings.
- Custom domain mapping and public route handling for generated landing pages.

### 6. 🚚 Logistics & Delivery Integrations
- Connects with local shipping provider APIs(Yalidine , ZRexpress and others ) for order fulfillment, tracking label creation, and delivery updates.

### 7. 👥 Team & RBAC (Role-Based Access Control)
- Multi-tenant team management.
- Granular permissions for **SUPERADMIN** (System-wide access) and **ADMIN** (Store-level management).

---

## 📁 Proposed Project Structure

```text
commercecraft/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login & Auth routes
│   │   ├── (dashboard)/        # Admin & SuperAdmin dashboard
│   │   │   ├── orders/         # Orders table & Google Sheets export settings
│   │   │   ├── products/
│   │   │   ├── landing-pages/
│   │   │   ├── store/
│   │   │   └── team/
│   │   └── api/                # Route Handlers (AI, External Webhooks, Shipping, Sheets Sync)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitive components
│   │   ├── orders/             # Order status badges, export modals, filter bars
│   │   ├── ai-editor/          # Canvas & live edit components
│   │   └── shared/             # Tables, Modals, Navbars
│   ├── lib/
│   │   ├── ai/                 # Gemini & Nano Banana client wrappers
│   │   ├── db/                 # Drizzle/Prisma schema and client connection
│   │   └── services/           # Google Sheets OAuth & Shipping API integrations
│   └── store/                  # Zustand global stores
├── public/
├── drizzle.config.ts           # DB migration & ORM settings
└── next.config.ts
````

## Instructions
- for every change or adding features check the code with `tsc` and run `react doctor` 
- test the app by using chrome-devtools mcp
