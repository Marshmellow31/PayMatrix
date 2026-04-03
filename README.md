# PayMatrix 💎

[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.0-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-00838F?logo=pwa)](https://web.dev/progressive-web-apps/)

**PayMatrix** is a premium, high-density expense sharing and settlement platform designed with the **Digital Obsidian** aesthetic. It simplifies group finances, provides deep analytical insights, and offers seamless settlement workflows through integrated payment links and QR codes.

[**🌐 Live Demo**](https://pay-matrix.vercel.app/)

---

## ✨ Features

### 🌑 Digital Obsidian Interface
Experience a state-of-the-art UI focused on high information density and premium aesthetics.
- **Glassmorphism**: Elegant frosted-glass effects for modals and cards.
- **Fluid Animations**: Powered by Framer Motion for a buttery-smooth UX.
- **Mobile Optimized**: A fully responsive PWA that feels like a native app.

### 💰 Precision Split Management
No more manual math. PayMatrix handles complex debts with ease.
- **Flexible Splitting**: Split equally, by fixed amounts, or by percentages.
- **Multi-Payer Support**: Log expenses paid by one or more members.
- **Debt Simplification**: Automatically minimizes the number of transactions required to settle up.

### ⚡ Seamless Settlements
Settle debts in seconds, not minutes.
- **UPI Integration**: Generate direct UPI deep links for phone-to-phone payments.
- **QR Code Generation**: Instantly create QR codes for any transaction.
- **Payment Success Verification**: Track settlement status in real-time.

### 📈 Visual Analytics & Reports
Understand where your money goes.
- **Interactive Dashboards**: Visualize spending trends with Chart.js.
- **Audit Trails**: Complete history of every expense edit and deletion.
- **Data Export**: Generate professional PDF reports or CSV audit logs for any group.

### 🔒 Security-First Architecture
Built for trust and reliability.
- **Email Verification**: Mandatory verification for all accounts.
- **Custom backend**: Secure JWT-based session management.
- **Zod Validation**: Robust schema-based data validation across the platform.
- **Rate Limiting**: Protection against brute force and API abuse.

---

## 🛠️ Technical Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS |
| **State Management** | Redux Toolkit, Redux Persist |
| **Database/Auth** | Firebase (Firestore, Auth, Storage) |
| **Animations** | Framer Motion |
| **Icons** | Lucide React, React Icons |
| **Reporting** | jsPDF, jspdf-autotable, json-2-csv |
| **Utilities** | Zod, Date-fns, DOMPurify |

---

## 🏗️ Deep Dive: Application Architecture

PayMatrix employs a **Hybrid Sync Architecture** that combines the real-time capabilities of Firebase with the predictable state management of Redux Toolkit.

### 🔄 Real-time Synchronization Flow
Unlike traditional REST-based apps, PayMatrix uses a "Push-First" data flow:
1. **User Action**: A user adds an expense or settles a debt.
2. **Optimistic Update**: The UI reflects the change immediately using Redux actions.
3. **Firestore Write**: The `expenseService` commits the data to Firestore.
4. **Snapshot Listener**: A global listener in `AppLayout` or `GroupDetail` detects the change in Firestore.
5. **Redux Sync**: The listener dispatches a `setExpenses` or `updateGroup` action, ensuring all clients stay perfectly in sync without manual refreshes.

---

## 📊 Database Topology (Firestore)

The data model is designed for high performance and strict security boundaries.

### 📂 Collections Hierarchy
- **`users/{userId}`**: 
  - `displayName`: User's public name.
  - `upiId`: Primary settlement address (UPI ID or payment link).
  - `friends`: Array of UIDs for quick network access.
- **`groups/{groupId}`**: 
  - `members`: Active participant UIDs.
  - `historicalMembers`: UIDs of past members (to preserve audit integrity).
  - **`expenses/{expenseId}`**: Sub-collection containing individual line items, participants, and split ratios.
  - **`settlements/{settlementId}`**: Direct payments between members.
  - **`logs/{logId}`**: Immutable audit trail for group activities.
- **`friendRequests/`**: Transient collection for managing network growth.
- **`rate_limits/{userId}`**: Tracks security-sensitive actions (e.g., invite generation, password changes).

---

## 🧠 State Management (Redux)

We use **Redux Toolkit** with **Redux Persist** to ensure a seamless experience even after browser restarts.

| Slice | Responsibility |
| :--- | :--- |
| **`auth`** | User session, profile metadata, and authentication status. |
| **`group`** | Active group context, member lists, and invite tokens. |
| **`expense`** | Real-time expense feed, active group balances, and split calculations. |
| **`notification`** | In-app alerts, friend request statuses, and system messages. |

---

## 🛡️ Security & Data Integrity

### 🚦 Smart Rate Limiting
The `rateLimitService` provides a distributed protection layer:
- **Transaction-Based**: Uses Firestore transactions to ensure limits are enforced across multiple devices.
- **Fail-Safe Mode**: Automatically detects offline contexts to allow user continuity while logging "security bypass" events for later audit.
- **Action-Specific Windows**: Granular control over attempt counts (e.g., 5 invites/hour, 100 expenses/day).

### 🧹 Input Hardening
- **XSS Prevention**: All rendering paths use `DOMPurify` to strip malicious scripts from group names or expense titles.
- **Schema Enforcement**: `Zod` validates every piece of data entering the system, preventing malformed objects from corrupting the state.
- **Firestore Guard**: Rules enforce that only group members can see group-specific data, and only admins can modify group settings.

---

## 💳 Settlement & UPI Logic

PayMatrix simplifies payments by generating standard-compliant UPI deep links:
- **Protocol**: `upi://pay?pa={upiId}&pn={name}&am={amount}&tn={description}&cu=INR`
- **Dynamic QR**: Uses `qrcode.react` to generate scannable codes that work with any Indian banking app (GPay, PhonePe, Paytm).
- **Balance Simplification**: Uses a greedy algorithm to resolve debts, minimizing the total number of payments needed within a group.

---

## 📂 Project Structure

```text
PayMatrix/
├── frontend/             # React/Vite application
│   ├── src/
│   │   ├── components/   # Reusable UI (Modals, Cards, Overlays)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Main application views (Dashboard, Groups, Profile)
│   │   ├── redux/        # Global state (Slices, Store configuration)
│   │   ├── services/     # API handlers and business logic
│   │   └── utils/        # Formatting and payment helpers
│   └── public/           # Static assets and PWA manifests
├── firestore.rules       # Security rules for database access
└── scripts/              # Database maintenance and utility scripts
```

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js**: v18.0 or higher
- **Firebase Account**: For Firestore and Authentication
- **NPM** or **Yarn**

### ⚙️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/PayMatrix.git
   cd PayMatrix
   ```

2. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the `frontend` directory using `.env.example` as a template:
   ```bash
   cp .env.example .env
   # Add your Firebase and API configuration keys
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

---

## 🛡️ Security Features

> [!IMPORTANT]
> To maintain the integrity of financial data, PayMatrix implements several security layers:

- **JWT Authentication**: Secured sessions with HttpOnly cookie support.
- **Strict Firestore Rules**: Data access is limited to group members and authorized entities.
- **Input Sanitization**: All user-generated content is sanitized via DOMPurify to prevent XSS.
- **Schema Validation**: Every API request and form submission is validated via Zod.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](file:///c:/Users/1080p/Desktop/PayMatrix/LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! If you have a suggestion that would make this better, please fork the repo and create a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---


