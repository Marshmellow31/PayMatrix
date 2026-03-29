# 💸 PayMatrix — Full Implementation Plan

> **Source of truth**: `README.md`
> **Last updated**: 2026-03-29

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Technology Matrix](#3-technology-matrix)
4. [Directory Blueprint](#4-directory-blueprint)
5. [Environment Configuration](#5-environment-configuration)
6. [Phase 1 — Core MVP](#6-phase-1--core-mvp)
7. [Phase 2 — Enhanced Splitting](#7-phase-2--enhanced-splitting)
8. [Phase 3 — PWA & Real-Time](#8-phase-3--pwa--real-time)
9. [Phase 4 — Analytics & Polish](#9-phase-4--analytics--polish)
10. [Phase 5 — Advanced Features](#10-phase-5--advanced-features)
11. [API Contract Reference](#11-api-contract-reference)
12. [DevOps & Deployment](#12-devops--deployment)
13. [Quality Standards](#13-quality-standards)

---

## 1. Project Overview

**PayMatrix** is a production-grade, mobile-first Progressive Web App for expense sharing, inspired by Splitwise. It is built on the MERN stack (MongoDB, Express, React, Node.js) and targets seamless bill splitting, real-time balance tracking, and simplified debt settlement across groups.

### Core Value Propositions

| Pillar | Description |
|--------|-------------|
| Simplified Debt Settlement | Minimizes transactions via an optimized algorithm |
| Mobile-First PWA | Installable, offline-capable, < 3s load, Lighthouse 90+ |
| Modern Fintech UI | "Digital Obsidian" dark theme, glassmorphism, Framer Motion animations |
| Secure by Design | JWT auth, input validation, rate limiting |
| Multi-Currency | Expense tracking across different currencies |
| Smart Analytics | Visual breakdowns with Chart.js |

---

## 2. Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React PWA)                       │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   Pages   │  │Components│  │  Redux   │  │ Service Worker│  │
│  │           │  │          │  │  Store   │  │  (Offline)    │  │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └───────────────┘  │
│        └──────────────┴─────────────┘                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────┴──────────────────────────────────────┐
│                     API Gateway (Express)                       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Auth    │  │   Routes &   │  │ Socket.IO│  │ Middleware │  │
│  │Middleware│  │  Controllers │  │  Server  │  │ (Rate Limit│  │
│  │  (JWT)   │  │              │  │          │  │  Validator)│  │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └────────────┘  │
│       └────────────────┴───────────────┘                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────┴──────┐  ┌─────┴──────┐  ┌──────┴──────┐
   │  MongoDB    │  │ Cloudinary │  │  Firebase   │
   │  (Atlas)    │  │  (Images)  │  │   (FCM)     │
   └─────────────┘  └────────────┘  └─────────────┘
```

### Layer Responsibilities

| Layer | Role |
|-------|------|
| **Client (React PWA)** | UI rendering, routing, Redux state, service worker for offline support |
| **API Gateway (Express)** | REST endpoints, JWT auth middleware, Socket.IO server, rate limiting, input validation |
| **MongoDB (Atlas)** | Primary data store for users, groups, expenses, settlements, notifications |
| **Cloudinary** | Receipt image and avatar storage |
| **Firebase (FCM)** | Push notification delivery to PWA clients |

---

## 3. Technology Matrix

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18+ | UI library |
| Tailwind CSS | 3+ | Utility-first CSS framework |
| Redux Toolkit | 2+ | Global state management |
| React Router | 6+ | Client-side routing |
| Vite | 5+ | Build tool & dev server |
| Chart.js | 4+ | Data visualization (pie, bar, trend) |
| Framer Motion | 11+ | Animations & transitions |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express | 4+ | Web framework |
| MongoDB | 6+ | NoSQL database |
| Mongoose | 8+ | MongoDB ODM |
| JWT (jsonwebtoken) | — | Stateless authentication |
| Socket.IO | 4+ | Real-time bidirectional communication |

### Cloud Services

| Service | Purpose |
|---------|---------|
| Cloudinary | Image/receipt storage & CDN delivery |
| Firebase (FCM) | Push notifications |
| Nodemailer | Email notifications (SMTP) |

### DevOps & Tooling

| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| Nginx | Reverse proxy |
| GitHub Actions | CI/CD pipeline |
| ESLint | Code linting |
| Prettier | Code formatting |

---

## 4. Directory Blueprint

```
PayMatrix/
├── backend/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── cloudinary.js          # Cloudinary SDK setup
│   ├── controllers/
│   │   ├── authController.js      # Register, login, OAuth, profile, password reset
│   │   ├── groupController.js     # Group CRUD, member management
│   │   ├── expenseController.js   # Expense CRUD with splits
│   │   ├── settlementController.js # Record & list settlements
│   │   └── notificationController.js # Notification read/list
│   ├── middleware/
│   │   ├── auth.js                # JWT verification, req.user population
│   │   ├── errorHandler.js        # Global error handler
│   │   ├── rateLimiter.js         # API rate limiting
│   │   └── validator.js           # Input validation (express-validator)
│   ├── models/
│   │   ├── User.js                # name, email, password, avatar, preferences
│   │   ├── Group.js               # title, category, members, currency, settings
│   │   ├── Expense.js             # title, amount, payer, splits, category, receipt
│   │   ├── Settlement.js          # payer, payee, amount, group ref
│   │   └── Notification.js        # type, message, read status, user ref
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── settlementRoutes.js
│   │   └── notificationRoutes.js
│   ├── services/
│   │   ├── balanceService.js      # Balance computation logic
│   │   ├── simplifyDebts.js       # Debt minimization algorithm
│   │   └── emailService.js        # Nodemailer transporter & templates
│   ├── socket/
│   │   └── index.js               # Socket.IO event handlers
│   ├── utils/
│   │   ├── generateToken.js       # JWT sign helper
│   │   └── apiResponse.js         # Standardized response formatter
│   ├── .env.example
│   ├── server.js                  # Entry point
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   ├── sw.js                  # Service worker
│   │   ├── icons/                 # PWA icons (192×192, 512×512)
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/                # Static images, fonts
│   │   ├── components/
│   │   │   ├── common/            # Button, Modal, Input, Avatar
│   │   │   ├── layout/            # Header, Sidebar, BottomNav
│   │   │   ├── expense/           # ExpenseCard, ExpenseForm
│   │   │   ├── group/             # GroupCard, MemberList
│   │   │   ├── balance/           # BalanceSummary, DebtCard
│   │   │   └── charts/            # PieChart, BarChart, TrendLine
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Groups.jsx
│   │   │   ├── GroupDetail.jsx
│   │   │   ├── AddExpense.jsx
│   │   │   ├── Settlements.jsx
│   │   │   ├── Activity.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── NotFound.jsx
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   ├── authSlice.js
│   │   │   ├── groupSlice.js
│   │   │   ├── expenseSlice.js
│   │   │   └── notificationSlice.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   └── useDebounce.js
│   │   ├── services/
│   │   │   ├── api.js             # Axios instance with interceptors
│   │   │   ├── authService.js
│   │   │   ├── groupService.js
│   │   │   └── expenseService.js
│   │   ├── utils/
│   │   │   ├── formatCurrency.js
│   │   │   └── constants.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css              # Tailwind imports
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── docs/
│   └── assets/
├── docker-compose.yml
├── .gitignore
├── LICENSE
└── README.md
```

---

## 5. Environment Configuration

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/paymatrix` |
| `JWT_SECRET` | JWT signing secret | `your_super_secret_key` |
| `JWT_EXPIRE` | Token expiration time | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your_api_secret` |
| `SMTP_HOST` | Email SMTP host | `smtp.gmail.com` |
| `SMTP_PORT` | Email SMTP port | `587` |
| `SMTP_USER` | Email address | `noreply@paymatrix.app` |
| `SMTP_PASS` | Email password / app password | `your_email_password` |
| `CLIENT_URL` | Frontend URL (CORS) | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | WebSocket server URL | `http://localhost:5000` |
| `VITE_FIREBASE_API_KEY` | Firebase config (push) | `your_firebase_key` |

---

## 6. Phase 1 — Core MVP

> **Goal**: A working app where users can register, create groups, add equally-split expenses, view balances, and record settlements.

### 6.1 Project Scaffolding

| Step | Details |
|------|---------|
| Initialize backend | `npm init` in `backend/`, install Express, Mongoose, dotenv, cors, helmet, morgan |
| Initialize frontend | Vite + React in `frontend/`, install Tailwind CSS 3, Redux Toolkit, React Router 6 |
| Create `.env.example` files | For both backend and frontend with all required variables |
| Configure ESLint + Prettier | Shared config at root or per-package |

### 6.2 Backend — Database & Configuration

| File | Deliverable |
|------|-------------|
| `config/db.js` | Mongoose connection to `MONGO_URI` with error handling and reconnect logic |
| `config/cloudinary.js` | Cloudinary v2 SDK configuration (used later in Phase 1 for avatars) |
| `server.js` | Express app setup: middleware stack (cors, helmet, morgan, json parser), route mounting under `/api/v1`, global error handler, listen on `PORT` |

### 6.3 Backend — Mongoose Models

| Model | Key Fields |
|-------|------------|
| **User** | `name`, `email`, `password` (hashed), `avatar`, `preferences`, `createdAt` |
| **Group** | `title`, `category` (Trip/Roommates/Events/Couple/Other), `members[]` (User refs), `admin` (User ref), `currency`, `simplifyDebts` (boolean), `defaultSplit`, `createdAt` |
| **Expense** | `title`, `amount`, `paidBy` (User ref), `group` (Group ref), `splitType` (equal), `splits[]` ({user, amount}), `category`, `date`, `notes`, `receipt` (URL), `createdAt` |
| **Settlement** | `payer` (User ref), `payee` (User ref), `amount`, `group` (Group ref), `createdAt` |
| **Notification** | `user` (User ref), `type`, `message`, `read` (boolean), `relatedGroup`, `createdAt` |

### 6.4 Backend — Middleware

| File | Responsibility |
|------|----------------|
| `middleware/auth.js` | Extract `Bearer` token from `Authorization` header → verify with `JWT_SECRET` → attach `req.user` |
| `middleware/errorHandler.js` | Catch-all error handler returning standardized JSON: `{ success, message, stack (dev only) }` |
| `middleware/rateLimiter.js` | express-rate-limit configuration for auth routes (e.g. 100 req/15min) |
| `middleware/validator.js` | express-validator chains for register, login, group, expense inputs |

### 6.5 Backend — Utilities

| File | Responsibility |
|------|----------------|
| `utils/generateToken.js` | `jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE })` |
| `utils/apiResponse.js` | Standardized success/error response helpers |

### 6.6 Backend — Auth Module

| Route | Method | Controller Logic |
|-------|--------|-----------------|
| `/api/v1/auth/register` | POST | Validate input → check duplicate email → hash password (bcrypt) → create User → return JWT |
| `/api/v1/auth/login` | POST | Validate input → find user → compare password → return JWT |
| `/api/v1/auth/google` | POST | Verify Google token → find or create user → return JWT |
| `/api/v1/auth/me` | GET | Protected → return `req.user` profile |
| `/api/v1/auth/profile` | PUT | Protected → update name, avatar, preferences |
| `/api/v1/auth/forgot-password` | POST | Generate reset token → save hashed token to User → send email via Nodemailer |
| `/api/v1/auth/reset-password/:token` | PUT | Verify token → hash new password → update User |

### 6.7 Backend — Group Module

| Route | Method | Controller Logic |
|-------|--------|-----------------|
| `/api/v1/groups` | POST | Protected → create group with `req.user` as admin and first member |
| `/api/v1/groups` | GET | Protected → return groups where user is a member |
| `/api/v1/groups/:id` | GET | Protected → return group details with populated members |
| `/api/v1/groups/:id` | PUT | Protected (admin only) → update group settings |
| `/api/v1/groups/:id` | DELETE | Protected (admin only) → delete group and cascade |
| `/api/v1/groups/:id/members` | POST | Protected (admin) → add member by email/ID |
| `/api/v1/groups/:id/members/:userId` | DELETE | Protected (admin) → remove member |

### 6.8 Backend — Expense Module (Equal Split Only)

| Route | Method | Controller Logic |
|-------|--------|-----------------|
| `/api/v1/groups/:id/expenses` | POST | Protected → validate → create expense → compute equal split across group members → log activity |
| `/api/v1/groups/:id/expenses` | GET | Protected → return expenses for group (paginated, sorted by date) |
| `/api/v1/expenses/:id` | GET | Protected → return expense details with splits |
| `/api/v1/expenses/:id` | PUT | Protected → update expense → recalculate splits |
| `/api/v1/expenses/:id` | DELETE | Protected → delete expense → recalculate balances |

### 6.9 Backend — Balance & Settlement Module

| Route | Method | Controller Logic |
|-------|--------|-----------------|
| `/api/v1/groups/:id/balances` | GET | Protected → run `balanceService.js`: aggregate all expenses and settlements → compute per-user net balance |
| `/api/v1/groups/:id/settlements` | POST | Protected → record settlement (payer, payee, amount) → create Notification |
| `/api/v1/groups/:id/settlements` | GET | Protected → return settlement history for group |

**`services/balanceService.js`**: For each group member, sum what they paid minus what they owe across all expenses, offset by recorded settlements. Return `{ userId, balance }` array.

### 6.10 Backend — Notification Module

| Route | Method | Controller Logic |
|-------|--------|-----------------|
| `/api/v1/notifications` | GET | Protected → return user's notifications (sorted, paginated) |
| `/api/v1/notifications/:id/read` | PUT | Protected → mark single notification as read |
| `/api/v1/notifications/read-all` | PUT | Protected → mark all user notifications as read |

### 6.11 Frontend — Foundation

| Step | Details |
|------|---------|
| Tailwind setup | Configure `tailwind.config.js` with the "Digital Obsidian" dark theme palette, Manrope + Inter fonts |
| `index.css` | Tailwind directives (`@tailwind base; components; utilities;`) plus global custom styles |
| `main.jsx` | Wrap app in Redux `<Provider>` and `<BrowserRouter>` |
| `App.jsx` | Define routes using React Router 6: `/login`, `/register`, `/dashboard`, `/groups`, `/groups/:id`, `/expenses/add`, `/settlements`, `/activity`, `/profile`, `*` (404) |

### 6.12 Frontend — Redux Store

| Slice | State Shape |
|-------|-------------|
| `authSlice` | `{ user, token, loading, error }` — async thunks for register, login, getMe, updateProfile |
| `groupSlice` | `{ groups[], currentGroup, loading, error }` — async thunks for CRUD |
| `expenseSlice` | `{ expenses[], currentExpense, loading, error }` — async thunks for CRUD |
| `notificationSlice` | `{ notifications[], unreadCount, loading }` — async thunks for fetch, markRead |

### 6.13 Frontend — API Service Layer

| File | Responsibility |
|------|----------------|
| `services/api.js` | Axios instance with `baseURL = VITE_API_URL`, request interceptor to attach `Authorization: Bearer <token>`, response interceptor for 401 logout |
| `services/authService.js` | `register()`, `login()`, `getMe()`, `updateProfile()`, `forgotPassword()`, `resetPassword()` |
| `services/groupService.js` | `createGroup()`, `getGroups()`, `getGroup()`, `updateGroup()`, `deleteGroup()`, `addMember()`, `removeMember()` |
| `services/expenseService.js` | `addExpense()`, `getExpenses()`, `getExpense()`, `updateExpense()`, `deleteExpense()` |

### 6.14 Frontend — Common Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Button` | `components/common/` | Reusable button with variants (primary, secondary, ghost), loading state |
| `Input` | `components/common/` | Form input with label, error, icon support |
| `Modal` | `components/common/` | Overlay modal with Framer Motion enter/exit |
| `Avatar` | `components/common/` | User avatar with fallback initials |
| `Header` | `components/layout/` | Top navigation bar |
| `Sidebar` | `components/layout/` | Desktop sidebar navigation |
| `BottomNav` | `components/layout/` | Mobile bottom tab navigation |

### 6.15 Frontend — Pages

| Page | Key Functionality |
|------|-------------------|
| `Login.jsx` | Email/password form, Google OAuth button, link to register |
| `Register.jsx` | Name, email, password form, link to login |
| `Dashboard.jsx` | Overall balance summary, recent activity, quick actions |
| `Groups.jsx` | Grid/list of user's groups with category icons |
| `GroupDetail.jsx` | Group info, member list, expense list, balance summary, settlement button |
| `AddExpense.jsx` | Expense form: title, amount, payer, category, equal split preview |
| `Settlements.jsx` | Settlement history, record new settlement form |
| `Activity.jsx` | Chronological activity feed with filtering |
| `Profile.jsx` | User info, avatar upload, preferences |
| `NotFound.jsx` | 404 page |

### 6.16 Frontend — Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Access auth state, login/logout/register dispatchers, redirect logic |
| `useDebounce` | Debounce search/filter inputs |

### Phase 1 Deliverable Checklist

- [ ] Backend server boots and connects to MongoDB
- [ ] All auth endpoints functional (register, login, Google OAuth, profile, password reset)
- [ ] Group CRUD fully operational with member management
- [ ] Expenses can be created with equal splits
- [ ] Balances calculate correctly
- [ ] Settlements can be recorded
- [ ] Notifications created on key events
- [ ] Frontend renders all pages with functional routing
- [ ] Redux state management wired to all API calls
- [ ] Login/Register flows complete
- [ ] Protected routes redirect unauthenticated users
- [ ] Responsive layout with Tailwind (mobile-first)

---

## 7. Phase 2 — Enhanced Splitting

> **Goal**: Support exact amount, percentage-based, and multiple-payer splits with debt simplification.

### 7.1 Backend — Split Type Expansion

| Split Type | Logic |
|------------|-------|
| **Equal** | `amount / members.length` per person (existing) |
| **Exact Amount** | User specifies exact amount per member; validate sum equals total |
| **Percentage** | User specifies percentage per member; validate percentages sum to 100%; compute amounts |

**Changes required:**
- `Expense` model: extend `splitType` enum to `['equal', 'exact', 'percentage']`
- `expenseController.js`: branching split computation logic based on `splitType`
- `middleware/validator.js`: new validation rules for exact/percentage split arrays

### 7.2 Backend — Multiple Payers

- `Expense` model: change `paidBy` from single User ref to `payers[]` array of `{ user: ObjectId, amount: Number }`
- `balanceService.js`: update computation to handle multiple payers per expense
- Validation: sum of payer amounts must equal expense total

### 7.3 Backend — Simplified Debt Algorithm

**`services/simplifyDebts.js`**:
- Compute net balance for each member (total paid − total owed + settlements)
- Separate into creditors (positive balance) and debtors (negative balance)
- Greedily match largest debtor to largest creditor, reducing both
- Return minimal list of `{ from, to, amount }` transactions

| Route | Method | Logic |
|-------|--------|-------|
| `/api/v1/groups/:id/simplify` | GET | Protected → run simplifyDebts → return optimized transaction list |

### 7.4 Frontend — Split UI

- `AddExpense.jsx`: add split type selector (Equal / Exact / Percentage)
- Render dynamic input fields per member based on split type
- Validation: amounts/percentages must balance
- Multiple payer selection with amount input per payer

### Phase 2 Deliverable Checklist

- [ ] Exact-amount splits create correct per-member breakdowns
- [ ] Percentage splits compute and validate correctly
- [ ] Multiple payers recorded and reflected in balances
- [ ] Simplified debts endpoint returns minimal transactions
- [ ] Frontend split type selector works with real-time validation
- [ ] All existing Phase 1 tests remain passing

---

## 8. Phase 3 — PWA & Real-Time

> **Goal**: Make the app installable, offline-capable, and real-time with Socket.IO and Firebase push notifications.

### 8.1 PWA — Service Worker & Manifest

| File | Deliverable |
|------|-------------|
| `public/manifest.json` | `name`, `short_name`, `start_url`, `display: standalone`, `background_color`, `theme_color`, `icons[]` (192×192, 512×512) |
| `public/sw.js` | Cache-first strategy for static assets; network-first for API calls; offline fallback page |
| `public/icons/` | PWA icons at required resolutions |

**PWA targets from README:**
- Installable (Add to Home Screen)
- Offline mode (basic caching)
- App-like navigation
- Fast loading (< 3s)
- Lighthouse score 90+

### 8.2 Backend — Socket.IO Server

**`socket/index.js`**:
- Attach Socket.IO to the Express HTTP server
- Authenticate socket connections via JWT token in handshake
- Room-based architecture: each group is a room
- Events to emit:
  - `expense:created` — when a new expense is added
  - `expense:updated` — when an expense is modified
  - `expense:deleted` — when an expense is removed
  - `settlement:created` — when a settlement is recorded
  - `member:added` / `member:removed` — group membership changes
  - `notification:new` — real-time notification push

**Integration**: Controllers emit socket events after successful database writes.

### 8.3 Frontend — Socket.IO Client

**`hooks/useSocket.js`**:
- Connect to `VITE_SOCKET_URL` with JWT token
- Join group rooms on `GroupDetail` mount
- Listen for events → dispatch Redux actions to update state in real-time
- Cleanup: leave rooms and disconnect on unmount

### 8.4 Push Notifications — Firebase Cloud Messaging

**Backend:**
- Store FCM token per user in `User` model
- On key events (expense added, settlement, reminder), send push via Firebase Admin SDK

**Frontend:**
- Request notification permission on login
- Register FCM service worker
- Store FCM token → send to backend via API
- Handle foreground notifications with in-app toast

### Phase 3 Deliverable Checklist

- [ ] App installable via "Add to Home Screen" on Chrome/Safari
- [ ] Offline mode shows cached data and offline indicator
- [ ] Service worker caches static assets correctly
- [ ] Socket.IO connections authenticate and join group rooms
- [ ] Real-time updates reflected in UI without refresh
- [ ] Push notifications received on mobile and desktop
- [ ] Lighthouse PWA audit passes with 90+ score

---

## 9. Phase 4 — Analytics & Polish

> **Goal**: Add expense categorization, visual charts, monthly summaries, and dark mode polish.

### 9.1 Expense Categories & Tagging

**Categories** (from README): Food, Travel, Rent, Entertainment, Utilities, and custom tags.

- `Expense` model: ensure `category` enum covers all listed categories
- Category icons/colors in frontend constants
- Filter expenses by category in `GroupDetail` and `Activity` pages

### 9.2 Charts & Analytics Dashboard

**Frontend components** (`components/charts/`):

| Component | Chart.js Type | Data |
|-----------|--------------|------|
| `PieChart` | Doughnut | Expense breakdown by category |
| `BarChart` | Bar | Monthly spending comparison |
| `TrendLine` | Line | Spending trend over time |

**Dashboard integration:**
- `Dashboard.jsx`: add analytics card with chart toggle
- `GroupDetail.jsx`: per-group analytics section
- Data fetched from existing expense endpoints with query params for date ranges

### 9.3 Monthly / Weekly Summaries

- Backend: aggregation pipeline endpoint or compute on frontend
- Frontend: date range selector (this week / this month / custom)
- Summary card showing total spent, total owed, total paid, top category

### 9.4 Dark Mode Toggle

- The "Digital Obsidian" theme is dark by default (per Stitch design system)
- Implement toggle in `Profile.jsx` or `Header`
- Store preference in Redux + localStorage
- Tailwind `darkMode: 'class'` configuration
- Define light-mode overrides in Tailwind config

### Phase 4 Deliverable Checklist

- [ ] All expenses tagged with categories
- [ ] Pie chart shows category breakdown
- [ ] Bar chart shows monthly comparison
- [ ] Trend line shows spending over time
- [ ] Monthly/weekly summary cards render correct data
- [ ] Dark/light mode toggle functions and persists
- [ ] Charts are responsive on mobile

---

## 10. Phase 5 — Advanced Features

> **Goal**: Multi-currency, smart reminders, receipt OCR, data export, and AI insights.

### 10.1 Multi-Currency Support

- `Group` model: `currency` field (default currency for the group)
- `Expense` model: `currency` field (per-expense override)
- Frontend: currency selector in group settings and expense form
- `utils/formatCurrency.js`: locale-aware formatting with `Intl.NumberFormat`
- Future consideration: exchange rate API integration for cross-currency settlement

### 10.2 Smart Debt Reminders

- `services/emailService.js`: scheduled job (node-cron or similar) to check outstanding balances
- Send automated reminder emails via Nodemailer for balances older than configurable threshold
- Push notification reminders via Firebase FCM
- User preference to opt-in/out of reminders in `Profile.jsx`

### 10.3 Receipt OCR (AI-Powered)

- Integrate an OCR service (e.g., Google Cloud Vision, Tesseract.js) to extract data from receipt images
- Auto-populate expense title, amount, and date from scanned receipt
- Cloudinary handles image upload; OCR runs on the stored image URL
- Frontend: camera/upload button in `AddExpense.jsx` with extraction preview

### 10.4 Export to PDF / CSV

- Backend: endpoint to generate expense/settlement reports
- PDF generation (e.g., PDFKit or html-pdf)
- CSV generation (json2csv)
- Frontend: download button in `GroupDetail` and analytics pages

### 10.5 AI-Based Expense Insights

- Analyze spending patterns across categories and time periods
- Generate recommendations (e.g., "You spent 40% more on Food this month")
- Surface insights on Dashboard as notification cards
- Implementation: backend analysis service or client-side computation from existing data

### Phase 5 Deliverable Checklist

- [ ] Multi-currency selection works in groups and expenses
- [ ] Currency formatting respects locale
- [ ] Automated reminders send on schedule
- [ ] Receipt OCR extracts and pre-fills expense data
- [ ] PDF and CSV export downloads work correctly
- [ ] AI insights surface on dashboard

---

## 11. API Contract Reference

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login & receive JWT |
| POST | `/auth/google` | Google OAuth login |
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/profile` | Update profile |
| POST | `/auth/forgot-password` | Request password reset |
| PUT | `/auth/reset-password/:token` | Reset password |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/groups` | Create a new group |
| GET | `/groups` | Get user's groups |
| GET | `/groups/:id` | Get group details |
| PUT | `/groups/:id` | Update group |
| DELETE | `/groups/:id` | Delete group |
| POST | `/groups/:id/members` | Add member |
| DELETE | `/groups/:id/members/:userId` | Remove member |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/groups/:id/expenses` | Add expense |
| GET | `/groups/:id/expenses` | Get group expenses |
| GET | `/expenses/:id` | Get expense details |
| PUT | `/expenses/:id` | Update expense |
| DELETE | `/expenses/:id` | Delete expense |

### Balances & Settlements

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups/:id/balances` | Get group balances |
| GET | `/groups/:id/simplify` | Get simplified debts |
| POST | `/groups/:id/settlements` | Record settlement |
| GET | `/groups/:id/settlements` | Get settlement history |

### Activity & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups/:id/activity` | Get group activity feed |
| GET | `/notifications` | Get user notifications |
| PUT | `/notifications/:id/read` | Mark notification as read |
| PUT | `/notifications/read-all` | Mark all as read |

---

## 12. DevOps & Deployment

### 12.1 Docker

**`docker-compose.yml`** services:

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `backend` | Node 18 Alpine | 5000 | Express API + Socket.IO |
| `frontend` | Node 18 Alpine (build) → Nginx | 80/443 | Vite build served via Nginx |
| `mongo` | mongo:6 | 27017 | Local development database |

### 12.2 Nginx

- Reverse proxy: route `/api` and `/socket.io` to backend container
- Serve frontend static build on `/`
- WebSocket upgrade headers for Socket.IO
- Gzip compression, SSL termination (production)

### 12.3 GitHub Actions CI/CD

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `ci.yml` | Push to `main`, PR | Lint (ESLint) → Format check (Prettier) → Unit tests → Build check |
| `deploy.yml` | Push to `main` (on merge) | Build Docker images → Push to registry → Deploy |

---

## 13. Quality Standards

| Area | Standard |
|------|----------|
| **Code Style** | ESLint + Prettier enforced on every commit |
| **Commit Messages** | Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`) |
| **Branching** | Feature branches: `feature/<name>`, bug fixes: `fix/<name>` |
| **PWA Performance** | Lighthouse score ≥ 90 across all categories |
| **Security** | JWT auth, bcrypt password hashing, rate limiting, input validation, CORS configured, helmet headers |
| **Responsive Design** | Mobile-first with Tailwind breakpoints; tested on 320px–2560px |
| **Accessibility** | Semantic HTML, ARIA labels, keyboard navigation |

---

## Design System Reference

**Stitch Project**: PayMatrix (`1467597674534806035`)
**Theme**: "The Digital Obsidian" — Dark Mode, Monochromatic, Glassmorphism
**Fonts**: Manrope (headlines) + Inter (body/labels)
**Surface Hierarchy**: `#131313` (base) → `#0E0E0E` (submerged) → `#2A2A2A` (elevated)
**Primary**: `#FFFFFF` with metallic gradient CTAs
**Borders**: Prohibited — use tonal surface shifts instead
**Animations**: Spring physics (damping 15, stiffness 150), 200ms hover transitions
**Corner Radius**: 8px default, 16px for cards, 9999px for pills/chips

---

> **This plan is the single source of execution truth for PayMatrix. Every module, route, component, and deliverable traces directly back to the README.**
