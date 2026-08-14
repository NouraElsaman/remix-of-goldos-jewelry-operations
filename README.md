# 💎 جوهرة تك | JawharaTech

> A modern, Arabic-first jewelry operations platform built for managing the daily workflow of jewelry businesses.

**JawharaTech** is a premium internal operations platform designed specifically for jewelry shops.

It is **not an e-commerce platform** and is not intended for selling jewelry online.

Instead, JawharaTech helps jewelry businesses manage their daily operations through a modern workspace for sales, inventory, gold pricing, invoices, reporting, and shop configuration.

The product combines a premium Arabic-first user experience with a structured backend powered by Supabase.

---

## ✨ Overview

Running a jewelry shop involves much more than simply selling products.

Daily operations require accurate handling of:

- Jewelry inventory
- Gold karats and weights
- Daily gold prices
- Manufacturing costs
- Sales transactions
- Customer information
- Invoices and receipts
- Shop settings
- Operational reporting

JawharaTech brings these workflows into one unified system designed specifically around jewelry business operations.

The interface is designed to feel modern, calm, premium, and easy to use — avoiding the complexity and visual overload commonly associated with traditional ERP systems.

---

# 🎯 Core Features

## 📊 Dashboard

The dashboard provides a central overview of the shop's operations.

It is designed to surface important business information at a glance, including operational metrics and current gold-related information.

Key areas include:

- Business overview
- Daily operational insights
- Gold price information
- Sales-related metrics
- Inventory summaries
- Quick access to core workflows

---

## 🧾 Cashier / POS

The Cashier module allows shop staff to create jewelry sales transactions.

### Current capabilities

- Select jewelry items from inventory
- Search inventory without loading the full catalog directly into the page
- Scrollable inventory selection for large inventories
- Search by:
  - Item ID / SKU
  - Item name
  - Gold karat
  - Weight
- Manual item entry
- Customer information
- Gold price handling
- Manufacturing cost handling
- Sale calculations
- Invoice generation
- Receipt display

The inventory selector is designed to scale to shops containing thousands of items.

---

## 💍 Inventory Management

JawharaTech provides inventory management specifically designed around jewelry products.

Each item can include information such as:

- Item name
- Item code / SKU
- Manufacturer / company
- Gold karat
- Weight
- Product type
- Inventory status

The system supports structured jewelry inventory instead of treating products like generic retail items.

---

## 📈 Gold Prices

The system supports managing and displaying current gold prices used throughout operational workflows.

Gold prices can be associated with different karats and used in calculations within the application.

---

## ⚙️ Settings

The Settings module allows configuration of shop-related information.

This includes areas such as:

- Shop information
- Invoice configuration
- Pricing and gold-related settings
- Security-related settings

The application is designed so business configuration can influence relevant operational screens without hardcoding shop-specific values into the UI.

---

# 🌍 Arabic-First Experience

JawharaTech is designed primarily for Arabic-speaking jewelry businesses.

The application supports:

- RTL layout
- Arabic-first user experience
- Proper directional handling
- Mixed Arabic and numeric content
- Correct display of:
  - Currency
  - Weights
  - Karats
  - SKU codes
  - Product identifiers

Special care is required when mixing RTL Arabic content with LTR technical or numeric values to prevent layout and alignment issues.

---

# 🎨 Design Philosophy

JawharaTech follows a premium and minimal design language inspired by modern product experiences rather than traditional ERP systems.

The design focuses on:

- Warm white surfaces
- Champagne and gold accents
- Spacious layouts
- Soft shadows
- Clear information hierarchy
- Premium typography
- Minimal visual noise
- Responsive layouts
- Smooth and purposeful interactions

The goal is to make a complex operational system feel simple and approachable.

---

# 🏗️ Technology Stack

The project is built with modern web technologies.

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend & Data

- Supabase
- PostgreSQL
- Supabase Authentication

### Development Platform

- Lovable

The project can be developed through Lovable or locally using a standard Node.js development environment.

---

# 🔐 Environment Configuration

The application uses environment variables to configure the active backend provider and Supabase connection.

Example:

```env
VITE_SERVICE_PROVIDER=supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

> ⚠️ Never commit real credentials, `.env`, or `.env.local` files to the repository.

The application should use the configured Supabase provider rather than silently falling back to mock data when the production data connection is expected.

---

# 🚀 Getting Started

## Prerequisites

Make sure you have:

- Node.js
- npm

installed on your machine.

---

## Clone the Repository

```bash
git clone https://github.com/NouraElsaman/remix-of-goldos-jewelry-operations.git
```

Navigate to the project:

```bash
cd remix-of-goldos-jewelry-operations
```

Install dependencies:

```bash
npm install
```

Create your local environment configuration:

```bash
cp .env.example .env.local
```

Then configure the required environment variables.

---

## Start the Development Server

```bash
npm run dev
```

The application will start in development mode.

---

## Production Build

To create a production build:

```bash
npm run build
```

---

# 📁 Project Architecture

The project follows a modular architecture that separates application concerns.

High-level areas include:

```text
src/
│
├── components/
│   ├── ui/
│   ├── shared/
│   └── layout/
│
├── features/
│   ├── dashboard/
│   ├── cashier/
│   ├── inventory/
│   ├── settings/
│   └── landing/
│
├── services/
│
├── providers/
│
├── routes/
│
├── hooks/
│
├── lib/
│
└── types/
```

The architecture is intended to keep feature logic, UI components, backend access, and shared functionality separated as the product grows.

---

# 🗄️ Backend Architecture

JawharaTech uses Supabase as the primary backend and data platform.

The backend layer is responsible for handling areas such as:

- Authentication
- Session management
- Inventory data
- Gold price data
- Sales data
- Invoice-related operations
- Shop configuration

The application should preserve a clear separation between UI components and data/service access.

---

# 🔄 Core Application Workflows

## Cashier Workflow

```text
Open Cashier
      ↓
Search Inventory
      ↓
Select Existing Item
      │
      ├── Search by SKU
      ├── Search by Name
      ├── Search by Karat
      └── Search by Weight
      │
      ↓
Or Enter Item Manually
      ↓
Add Customer Information
      ↓
Calculate Sale
      ↓
Create Invoice
      ↓
Store Transaction
      ↓
Display Receipt
```

---

## Inventory Workflow

```text
Add Item
    ↓
Enter Item Details
    ↓
Assign Code / SKU
    ↓
Select Karat
    ↓
Enter Weight
    ↓
Add Manufacturer Information
    ↓
Save to Inventory
```

---

# 📱 Responsive Design

JawharaTech is designed with a desktop-first approach while maintaining responsive behavior.

The interface should adapt across:

- Desktop
- Laptop
- Tablet
- Mobile

Responsive changes must preserve:

- RTL behavior
- Information hierarchy
- Form usability
- Table readability
- Cashier workflow efficiency

---

# 🧪 Development Principles

When extending the application:

### Preserve Existing Architecture

Avoid unnecessary rewrites of working systems.

### Protect Core Workflows

Changes to one module should not unintentionally break:

- Authentication
- Supabase integration
- Existing services
- Inventory logic
- Cashier calculations
- RTL behavior

### Avoid Unnecessary Global UI Changes

A fix to one page should remain scoped to that page whenever possible.

### Protect the Landing Page

The landing page contains its own visual and animation logic.

Changes to dashboard, cashier, inventory, settings, or other authenticated application pages should **not modify or interfere with the landing page** unless explicitly required.

This includes:

- Three.js implementation
- Ring box scene
- Scroll animations
- Landing layout
- Landing-specific styles
- Landing assets

---

# 🛣️ Product Roadmap

JawharaTech is being developed iteratively.

### Current Foundation

- [x] Premium application interface
- [x] Arabic-first RTL experience
- [x] Dashboard
- [x] Cashier workflow
- [x] Searchable inventory selection
- [x] Manual cashier entry
- [x] Inventory management
- [x] Gold pricing
- [x] Settings
- [x] Supabase backend integration
- [x] Authentication and protected application access
- [x] Invoice and receipt workflow
- [x] Responsive UI improvements

### Next Areas

- [ ] Daily weight reconciliation improvements
- [ ] Advanced reports
- [ ] Business analytics
- [ ] User roles and permissions
- [ ] Advanced inventory operations
- [ ] Enhanced audit history
- [ ] Multi-shop support
- [ ] AI-powered business capabilities

> AI functionality is planned as a future expansion and is not part of the current core MVP.

---

# 🔮 Future Vision

JawharaTech is designed to grow beyond a single jewelry shop.

Future versions may support:

- Multiple branches
- Multiple jewelry shops
- Advanced analytics
- Role-based access control
- Audit trails
- Business intelligence
- AI-assisted operational insights
- Demand and inventory analysis
- Smart reporting

The current architecture should evolve carefully without sacrificing the simplicity of the core jewelry-shop workflow.

---

# 🛡️ Security Notes

Sensitive configuration must never be committed to GitHub.

Do not commit:

```text
.env
.env.local
API keys
Supabase secrets
Service credentials
```

Use environment variables and deployment-platform secrets instead.

---

# 🤝 Development

This project is actively evolving.

When contributing or extending the system:

1. Understand the existing feature before modifying it.
2. Keep changes scoped to the requested module.
3. Avoid unnecessary refactoring.
4. Preserve existing backend and authentication behavior.
5. Test RTL and mixed Arabic/LTR content.
6. Test large inventory scenarios.
7. Avoid loading large datasets directly into the UI unnecessarily.
8. Protect the landing page from unrelated application changes.
9. Verify TypeScript and production builds before merging changes.

---

# 💎 JawharaTech

**JawharaTech** is building a modern operational experience for jewelry businesses.

Elegant enough for a premium jewelry brand.

Structured enough for daily business operations.

Simple enough to use every day.

---

Built with ❤️ using modern web technologies.
