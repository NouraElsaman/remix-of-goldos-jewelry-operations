# 💎 جوهرة تك | JawharaTech

> A modern, Arabic-first jewelry operations platform built for managing the daily workflow of jewelry businesses.

**JawharaTech** is a premium internal operations platform designed specifically for jewelry shops.

It is **not an e-commerce platform** and is not intended for selling jewelry online.

Instead, JawharaTech helps jewelry businesses manage their daily operations through a modern workspace for sales, inventory, gold pricing, invoices, safe weight reconciliation, automated EOD owner reporting, and shop configuration.

The product combines a premium Arabic-first user experience with a structured backend powered by Supabase and automated server-side email & PDF generation via Resend API.

---

## ✨ Overview

Running a jewelry shop involves much more than simply selling products.

Daily operations require accurate handling of:

- Jewelry inventory with item editing and deletion
- Gold karats (18K, 21K, 24K) and weights
- Daily gold prices
- Manufacturing costs (المصنعية)
- Sales & scrap buying transactions (شراء الكسر)
- Customer information
- Customized invoices and receipts with Tax ID, Commercial Register & Shop Logo
- Safe weight reconciliation (مطابقة أوزان الخزينة)
- Automated End-of-Day (EOD) reporting to owner via Email & WhatsApp with PDF attachments
- Shop settings and configuration

JawharaTech brings these workflows into one unified system designed specifically around jewelry business operations.

The interface is designed to feel modern, calm, premium, and easy to use — avoiding the complexity and visual overload commonly associated with traditional ERP systems.

---

# 🎯 Core Features

## 📊 Dashboard

The dashboard provides a central overview of the shop's operations.

It is designed to surface important business information at a glance, including operational metrics and current gold-related information.

Key areas include:

- Business overview
- Daily operational insights & net cash flow
- Gold price information
- Sales & scrap buying metrics
- Inventory summaries
- Quick access to core workflows and EOD reports

---

## 🧾 Cashier / POS

The Cashier module allows shop staff to create jewelry sales and scrap purchase transactions.

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
- Manufacturing cost handling (المصنعية)
- Sale & purchase calculations
- Invoice generation with tax credit, business record (السجل التجاري), exact address, and store logo
- Dual-copy receipt printing (2 copies optimized per print)

---

## 💍 Inventory Management

JawharaTech provides inventory management specifically designed around jewelry products.

Each item can include information such as:

- Item name
- Item code / SKU
- Manufacturer / company
- Gold karat (18K, 21K, 24K)
- Weight
- Product type
- Inventory status

### Item Actions

- **Edit Item (تعديل):** Update item details, weight, karat, and company directly from the inventory table.
- **Delete Item (حذف):** Remove items safely from the active inventory catalog.

---

## 🔒 Safe Weight Reconciliation (مطابقة الخزينة)

Track daily gold inventory weights across all karats (18K, 21K, 24K):

- **Opening Weight (الافتتاحي):** Starting stock weight for the day
- **Received Weight (المستلم):** New inventory added during the day
- **Sold Weight (المباع):** Weight of sold jewelry
- **Expected Weight (المتوقع):** Calculated expected weight in safe
- **Counted Weight (الفعلي):** Physical weight counted at end of day
- **Variance (الفرق):** Real-time difference detection (+ / - grams)

---

## 📧 Automated End-of-Day (EOD) Owner Reporting & PDF Attachments

When the day is closed, JawharaTech automatically generates and delivers a comprehensive End-of-Day Report to the store owner:

- **Instant Resend Email Dispatch:** Delivers immediately to the owner's email (`hotohory13@gmail.com`).
- **100% RTL Email Template:** Designed with bulletproof HTML tables containing:
  - 4 Executive KPI Cards (Net Cash Flow, Sales, Scrap Purchases, Labor Earnings)
  - Daily Gold Weight Movements (Sold & Scrap Bought by Karat)
  - Safe Weight Reconciliation & Variance Table
- **Dynamic PDF Attachment:** Automatically generates and attaches a high-resolution Arabic PDF document named after the Day Name and Date (e.g. `تقرير_الإغلاق_الجمعة_2026-08-14.pdf`).
- **WhatsApp Summary Generator:** Creates a pre-formatted Arabic summary text ready for 1-click WhatsApp dispatch to the owner's phone.

---

## 📈 Gold Prices

The system supports managing and displaying current gold prices used throughout operational workflows.

Gold prices can be associated with different karats and used in calculations within the application.

---

## ⚙️ Settings

The Settings module allows configuration of shop-related information.

This includes areas such as:

- Shop information (Arabic & English name, address, phone)
- Tax Registration Number (الرقم الضريبي) & Commercial Register (السجل التجاري)
- Shop Logo upload for official invoices and receipts
- Owner details & email configuration for automated EOD reports
- Resend API key setup
- Pricing and gold-related settings
- Security-related settings

---

# 🌍 Arabic-First Experience

JawharaTech is designed primarily for Arabic-speaking jewelry businesses.

The application supports:

- RTL layout
- Arabic-first user experience
- Proper directional handling
- Mixed Arabic and numeric content
- Correct display of:
  - Currency (ج.م)
  - Weights (جم)
  - Karats (18K, 21K, 24K)
  - SKU codes
  - Product identifiers

---

# 🎨 Design Philosophy

JawharaTech follows a premium and minimal design language inspired by modern product experiences rather than traditional ERP systems.

The design focuses on:

- Warm white surfaces
- Champagne and gold accents
- Spacious layouts
- Soft shadows
- Clear information hierarchy
- Premium typography (Inter & Amiri fonts)
- Minimal visual noise
- Responsive layouts
- Smooth and purposeful interactions

---

# 🏗️ Technology Stack

The project is built with modern web technologies.

### Frontend

- React 19
- TypeScript
- Vite / TanStack Start
- Tailwind CSS

### Backend & Serverless Services

- Supabase (PostgreSQL, Authentication, Realtime Storage)
- Resend API (Server-side automated email dispatch)
- jsPDF & jspdf-autotable (Arabic PDF document generation)
- TanStack Server Functions (`createServerFn`)

---

# 🔐 Environment Configuration

The application uses environment variables to configure Supabase and Resend API.

Example `.env.local`:

```env
VITE_SERVICE_PROVIDER=supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
RESEND_API_KEY=your_resend_api_key
```

> ⚠️ Never commit real credentials, `.env`, or `.env.local` files to the repository.

---

# 🚀 Getting Started

## Prerequisites

Make sure you have Node.js and npm installed.

---

## Clone the Repository

```bash
git clone https://github.com/hotohory13/remix-of-goldos-jewelry-operations.git
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

The application will start in development mode at `http://localhost:8080`.

---

## Production Build

To create a production build:

```bash
npm run build
```

---

# 🛣️ Product Roadmap

### Current Foundation

- [x] Premium application interface
- [x] Arabic-first RTL experience
- [x] Dashboard with operational insights
- [x] Cashier / POS workflow with sale & purchase handling
- [x] Searchable inventory selection
- [x] Inventory item editing & deletion (تعديل وحذف المنتجات)
- [x] Customized Invoices with Tax ID, Commercial Register & Logo
- [x] Dual-copy receipt printing (طباعة نسختين)
- [x] Daily Safe Weight Reconciliation (مطابقة أوزان الخزينة)
- [x] Automated EOD Owner Report via Resend Email & WhatsApp
- [x] Dynamic Arabic PDF report attachment named after Day & Date
- [x] Gold pricing management
- [x] Shop Settings (Tax, Register, Logo, Owner Email)
- [x] Supabase backend integration
- [x] Authentication and protected application access

---

# 💎 JawharaTech

**JawharaTech** is building a modern operational experience for jewelry businesses.

Elegant enough for a premium jewelry brand.
Structured enough for daily business operations.
Simple enough to use every day.

---

Built with ❤️ using modern web technologies.
