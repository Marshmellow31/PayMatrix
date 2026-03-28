<div align="center">

# 💸 PayMatrix

### _Smart Expense Sharing — Simplified._

A production-grade, full-featured expense-sharing Progressive Web App (PWA) inspired by Splitwise, built with the **MERN stack**. Track shared expenses, split bills effortlessly, and settle balances with a modern, mobile-first experience.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3+-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

<img src="docs/assets/banner.png" alt="PayMatrix Banner" width="800" />

[Live Demo](#) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [PWA Support](#-pwa-support)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 🚀 About the Project

**PayMatrix** is a modern, open-source alternative to Splitwise, designed to make expense sharing seamless and stress-free. Whether you're splitting rent with roommates, sharing travel costs, or managing group dinners — PayMatrix handles the math so you don't have to.

### Why PayMatrix?

- 🎯 **Simplified Debt Settlement** — Minimizes the number of transactions using an optimized algorithm
- 📱 **Mobile-First PWA** — Installable, offline-capable, and blazing fast
- 🎨 **Modern Fintech UI** — Clean, intuitive interface with smooth animations
- 🔒 **Secure by Design** — JWT auth, input validation, rate limiting, and more
- 🌍 **Multi-Currency Support** — Track expenses across different currencies
- 📊 **Smart Analytics** — Visual breakdowns with charts and insights

---

## ✨ Key Features

### 🔐 Authentication & User Management
| Feature | Description |
|---------|-------------|
| Sign Up / Login | Email + Password with secure hashing |
| OAuth Integration | Google & GitHub social login |
| JWT Authentication | Stateless, secure token-based auth |
| Profile Management | Name, avatar, preferences |

### 👥 Group Management
| Feature | Description |
|---------|-------------|
| Create Groups | Categories: Trip, Roommates, Events, Couple, Other |
| Member Management | Add/remove members with invitation links |
| Role-Based Access | Admin & Member roles with granular permissions |
| Group Settings | Currency, simplify debts toggle, default split |

### 💰 Expense Management
| Feature | Description |
|---------|-------------|
| Add Expenses | Title, amount, payer, category, date & notes |
| Split Types | Equal, Exact Amount, Percentage-based splits |
| Multiple Payers | Support for shared payment scenarios |
| Receipt Attachments | Upload and store receipt images |
| Edit / Delete | Full CRUD with activity logging |

### ⚖️ Balance & Settlement
| Feature | Description |
|---------|-------------|
| Real-Time Balances | Instant balance recalculation on changes |
| Debt Simplification | Minimize transactions algorithm |
| Settlement Recording | Record payments between users |
| Settlement History | Complete audit trail of all settlements |

### 📊 Analytics & Insights
| Feature | Description |
|---------|-------------|
| Expense Categories | Food, Travel, Rent, Entertainment, Utilities, etc. |
| Visual Charts | Pie charts, bar graphs, trend lines |
| Monthly Summaries | Spending breakdowns by period |
| Group Analytics | Per-group spending insights |

### 🔔 Notifications
| Feature | Description |
|---------|-------------|
| In-App Notifications | Real-time updates for expenses & settlements |
| Email Notifications | Optional digest emails for pending debts |
| Push Notifications | PWA push notification support |
| Smart Reminders | Automated reminders for outstanding balances |

### 📱 Activity Feed
| Feature | Description |
|---------|-------------|
| Timeline View | Chronological activity stream |
| Group Activities | Expenses, settlements, edits, member changes |
| Filtering | Filter by type, date range, member |

---

## 🧱 Tech Stack

<div align="center">

### MERN Stack + Modern Tooling

</div>

### Frontend

| Technology | Purpose | Version |
|:----------:|:--------|:-------:|
| ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black) | UI Library | 18+ |
| ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white) | Utility-First CSS Framework | 3+ |
| ![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=for-the-badge&logo=redux&logoColor=white) | State Management | 2+ |
| ![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white) | Client-Side Routing | 6+ |
| ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) | Build Tool & Dev Server | 5+ |
| ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white) | Data Visualization | 4+ |
| ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white) | Animations & Transitions | 11+ |

### Backend

| Technology | Purpose | Version |
|:----------:|:--------|:-------:|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white) | Runtime Environment | 18+ |
| ![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white) | Web Framework | 4+ |
| ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white) | NoSQL Database | 6+ |
| ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white) | MongoDB ODM | 8+ |
| ![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white) | Authentication | — |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white) | Real-Time Communication | 4+ |

### DevOps & Tooling

| Technology | Purpose | Version |
|:----------:|:--------|:-------:|
| ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) | Containerization | — |
| ![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white) | Reverse Proxy | — |
| ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white) | CI/CD Pipeline | — |
| ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white) | Code Linting | — |
| ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black) | Code Formatting | — |

### Cloud Services

| Service | Purpose |
|:-------:|:--------|
| ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white) | Image/Receipt Storage |
| ![Firebase](https://img.shields.io/badge/Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white) | Push Notifications (FCM) |
| ![Nodemailer](https://img.shields.io/badge/Nodemailer-0078D4?style=for-the-badge&logo=gmail&logoColor=white) | Email Notifications |

---

## 🏗 Architecture

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

---

## 🏁 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** >= 18.x — [Download](https://nodejs.org/)
- **npm** >= 9.x or **yarn** >= 1.22
- **MongoDB** >= 6.x — [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Git** — [Download](https://git-scm.com/)
- **Docker** _(optional)_ — [Download](https://www.docker.com/get-started)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/YashSejani/PayMatrix.git
   cd PayMatrix
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**

   ```bash
   # Backend
   cp backend/.env.example backend/.env

   # Frontend
   cp frontend/.env.example frontend/.env
   ```

5. **Start development servers**

   ```bash
   # Terminal 1 — Backend
   cd backend
   npm run dev

   # Terminal 2 — Frontend
   cd frontend
   npm run dev
   ```

6. **Open in browser**

   ```
   Frontend: http://localhost:5173
   Backend:  http://localhost:5000
   ```

### Docker Setup

```bash
# Build and start all services
docker-compose up --build

# Stop services
docker-compose down
```

---

## 🔧 Environment Variables

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
| `VITE_FIREBASE_API_KEY` | Firebase config (push notifs) | `your_firebase_key` |

---

## 📡 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login & receive JWT |
| `POST` | `/auth/google` | Google OAuth login |
| `GET` | `/auth/me` | Get current user profile |
| `PUT` | `/auth/profile` | Update profile |
| `POST` | `/auth/forgot-password` | Request password reset |
| `PUT` | `/auth/reset-password/:token` | Reset password |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/groups` | Create a new group |
| `GET` | `/groups` | Get user's groups |
| `GET` | `/groups/:id` | Get group details |
| `PUT` | `/groups/:id` | Update group |
| `DELETE` | `/groups/:id` | Delete group |
| `POST` | `/groups/:id/members` | Add member |
| `DELETE` | `/groups/:id/members/:userId` | Remove member |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/groups/:id/expenses` | Add expense |
| `GET` | `/groups/:id/expenses` | Get group expenses |
| `GET` | `/expenses/:id` | Get expense details |
| `PUT` | `/expenses/:id` | Update expense |
| `DELETE` | `/expenses/:id` | Delete expense |

### Balances & Settlements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/groups/:id/balances` | Get group balances |
| `GET` | `/groups/:id/simplify` | Get simplified debts |
| `POST` | `/groups/:id/settlements` | Record settlement |
| `GET` | `/groups/:id/settlements` | Get settlement history |

### Activity & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/groups/:id/activity` | Get group activity feed |
| `GET` | `/notifications` | Get user notifications |
| `PUT` | `/notifications/:id/read` | Mark notification as read |
| `PUT` | `/notifications/read-all` | Mark all as read |

> 📝 Full API documentation with request/response schemas will be available via **Swagger UI** at `/api-docs` when running the server.

---

## 📱 PWA Support

PayMatrix is a fully-featured Progressive Web App:

| Feature | Status |
|---------|--------|
| ✅ Installable (Add to Home Screen) | Supported |
| ✅ Offline Mode (basic caching) | Supported |
| ✅ App-like Navigation | Supported |
| ✅ Push Notifications | Supported |
| ✅ Responsive Design | Supported |
| ✅ Fast Loading (< 3s) | Optimized |
| ✅ Lighthouse Score 90+ | Target |

### Install on Mobile

1. Open PayMatrix in Chrome/Safari
2. Tap the **"Add to Home Screen"** prompt (or use browser menu)
3. Launch from your home screen like a native app

---

## 📁 Project Structure

```
PayMatrix/
├── 📂 backend/
│   ├── 📂 config/              # Database & env configuration
│   │   ├── db.js
│   │   └── cloudinary.js
│   ├── 📂 controllers/         # Route handler logic
│   │   ├── authController.js
│   │   ├── groupController.js
│   │   ├── expenseController.js
│   │   ├── settlementController.js
│   │   └── notificationController.js
│   ├── 📂 middleware/           # Custom middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validator.js
│   ├── 📂 models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Expense.js
│   │   ├── Settlement.js
│   │   └── Notification.js
│   ├── 📂 routes/              # API route definitions
│   │   ├── authRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── settlementRoutes.js
│   │   └── notificationRoutes.js
│   ├── 📂 services/            # Business logic & algorithms
│   │   ├── balanceService.js
│   │   ├── simplifyDebts.js
│   │   └── emailService.js
│   ├── 📂 socket/              # Socket.IO event handlers
│   │   └── index.js
│   ├── 📂 utils/               # Helper utilities
│   │   ├── generateToken.js
│   │   └── apiResponse.js
│   ├── .env.example
│   ├── server.js               # Entry point
│   └── package.json
│
├── 📂 frontend/
│   ├── 📂 public/
│   │   ├── manifest.json       # PWA manifest
│   │   ├── sw.js               # Service worker
│   │   ├── icons/              # PWA icons (192, 512)
│   │   └── favicon.ico
│   ├── 📂 src/
│   │   ├── 📂 assets/          # Static assets (images, fonts)
│   │   ├── 📂 components/      # Reusable UI components
│   │   │   ├── common/         # Button, Modal, Input, Avatar
│   │   │   ├── layout/         # Header, Sidebar, BottomNav
│   │   │   ├── expense/        # ExpenseCard, ExpenseForm
│   │   │   ├── group/          # GroupCard, MemberList
│   │   │   ├── balance/        # BalanceSummary, DebtCard
│   │   │   └── charts/         # PieChart, BarChart, TrendLine
│   │   ├── 📂 pages/           # Page-level components
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
│   │   ├── 📂 redux/           # Redux Toolkit slices
│   │   │   ├── store.js
│   │   │   ├── authSlice.js
│   │   │   ├── groupSlice.js
│   │   │   ├── expenseSlice.js
│   │   │   └── notificationSlice.js
│   │   ├── 📂 hooks/           # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   └── useDebounce.js
│   │   ├── 📂 services/        # API service layer
│   │   │   ├── api.js          # Axios instance
│   │   │   ├── authService.js
│   │   │   ├── groupService.js
│   │   │   └── expenseService.js
│   │   ├── 📂 utils/           # Frontend utilities
│   │   │   ├── formatCurrency.js
│   │   │   └── constants.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind imports
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── 📂 docs/                    # Documentation & assets
│   └── 📂 assets/
├── docker-compose.yml
├── .gitignore
├── LICENSE
└── README.md
```

---

## 📸 Screenshots

<div align="center">

> 🚧 _Screenshots will be added once the UI is built. Stay tuned!_

<!--
| Dashboard | Group View | Add Expense |
|:---------:|:----------:|:-----------:|
| ![Dashboard](docs/assets/dashboard.png) | ![Group](docs/assets/group.png) | ![Add Expense](docs/assets/add-expense.png) |

| Balances | Activity Feed | Settings |
|:--------:|:-------------:|:--------:|
| ![Balances](docs/assets/balances.png) | ![Activity](docs/assets/activity.png) | ![Settings](docs/assets/settings.png) |
-->

</div>

---

## 🗺 Roadmap

### Phase 1 — Core MVP ✅
- [x] Project setup (MERN + Vite + Tailwind)
- [ ] User authentication (JWT + OAuth)
- [ ] Group CRUD operations
- [ ] Expense management (equal split)
- [ ] Basic balance calculation
- [ ] Settlement recording

### Phase 2 — Enhanced Splitting
- [ ] Exact amount split
- [ ] Percentage-based split
- [ ] Multiple payers support
- [ ] Simplified debt algorithm

### Phase 3 — PWA & Real-Time
- [ ] Service worker & offline caching
- [ ] PWA manifest & installability
- [ ] Socket.IO real-time updates
- [ ] Push notifications (Firebase)

### Phase 4 — Analytics & Polish
- [ ] Expense categories & tagging
- [ ] Charts & analytics dashboard
- [ ] Monthly/weekly summaries
- [ ] Dark mode toggle

### Phase 5 — Advanced Features
- [ ] Multi-currency support
- [ ] Smart debt reminders
- [ ] Receipt OCR (AI-powered)
- [ ] Export to PDF/CSV
- [ ] AI-based expense insights

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are **greatly appreciated**.

1. **Fork** the project
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Formatting, no code change |
| `refactor:` | Code restructuring |
| `test:` | Adding tests |
| `chore:` | Maintenance tasks |

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 🙏 Acknowledgements

- [Splitwise](https://www.splitwise.com/) — Inspiration for core functionality
- [React](https://react.dev/) — UI library
- [Tailwind CSS](https://tailwindcss.com/) — Styling framework
- [MongoDB](https://www.mongodb.com/) — Database
- [Socket.IO](https://socket.io/) — Real-time engine
- [Chart.js](https://www.chartjs.org/) — Data visualization
- [Framer Motion](https://www.framer.com/motion/) — Animations
- [Cloudinary](https://cloudinary.com/) — Media management
- [Shields.io](https://shields.io/) — README badges

---

<div align="center">

**Built with ❤️ by [Yash Sejani](https://github.com/YashSejani)**

⭐ **Star this repo if you find it helpful!** ⭐

</div>
