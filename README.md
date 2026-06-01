# Wholesale Pharmacy Management System

Offline desktop app built with **Electron + Node.js + SQLite**.

---

## Setup & Run

### 1. Install Node.js
Download from https://nodejs.org (v18 or higher recommended)

### 2. Install dependencies
```
npm install
```

### 3. Run the app
```
npm start
```

---

## Default Login
- **Username:** `admin`
- **Password:** `admin123`

---

## Features
- **Dashboard** — Sales summary, stock alerts, expiry alerts
- **Sales (Invoice)** — Wholesale invoice with partial payment, customer balance
- **Purchases** — Add stock with batch/expiry, auto-updates inventory
- **Inventory** — Batch-wise stock, expiry alerts, edit batches
- **Customers** — Full ledger, debit/credit, payment recording
- **Suppliers** — Supplier management
- **Reports** — Daily sales, profit, expiry, customer balances, stock summary
- **Backup** — One-click USB/folder backup with timestamp
- **Settings** — Pharmacy info, user management, password change

---

## Database
SQLite stored at: `%APPDATA%\pharma-wholesale\pharmacy.db`

---

## Tech Stack
- Electron 29
- better-sqlite3 (synchronous SQLite)
- Bootstrap 5 (CDN)
- Font Awesome 6 (CDN)
- Vanilla JavaScript (no build step)
