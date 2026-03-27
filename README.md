# 🔐 MedRef — Open Source Project

A comprehensive full-stack application combining mobile technology with blockchain integration for secure data management.

---

## 🎯 Project Overview

MedRef is a **monorepo project** consisting of three main components:

| Component | Description |
|-----------|-------------|
| 🎨 **Frontend** | Cross-platform mobile app (iOS, Android, Web) |
| ⚙️ **Backend** | RESTful API with database integration |
| ⛓️ **Contracts** | Smart contracts for blockchain integration |

---

## ✨ Core Features

### 🎨 Frontend (Mobile App)
- 📱 Cross-platform support via React Native/Expo
- 🌐 Offline-first architecture
- 🔐 Secure data handling
- ⌚ Device integration support
- 📲 QR code functionality

### ⚙️ Backend (Server)
- 🔐 JWT-based authentication
- 🗄️ Database management with Prisma ORM
- 🔄 Data synchronization
- 🌍 RESTful APIs
- 📄 Document management

### ⛓️ Smart Contracts (Blockchain)
- 🔗 Polygon Amoy testnet integration
- 🔒 Immutable record storage
- 🔑 Access control mechanisms
- ✍️ Consent management

---

## 🛠️ Tech Stack

### 🎨 Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| ⚛️ React Native | 0.81.5 | Cross-platform framework |
| 📱 Expo | 54 | Development & deployment |
| 🗺️ Expo Router | Latest | File-based routing |
| 🎭 React Hooks | Built-in | State management |
| 💾 AsyncStorage | Latest | Local data persistence |
| 📦 TypeScript | 5.9.2 | Type safety |

### ⚙️ Backend
| Technology | Purpose |
|-----------|---------|
| 🟢 Node.js | Runtime environment |
| 🚂 Express.js | Web framework |
| 🗄️ Prisma | ORM & database client |
| 🐘 PostgreSQL/MySQL | Relational database |
| 🔐 JWT | Authentication |
| 🔒 bcrypt | Password hashing |
| 📦 TypeScript | Type safety |

### ⛓️ Blockchain
| Technology | Purpose |
|-----------|---------|
| 🔨 Hardhat | Development framework |
| 🌐 Solidity | Smart contract language |
| 🔗 Polygon Amoy | Testnet network |
| 📜 ethers.js | Web3 library |
| 🔐 @noble/curves | Cryptography |
| #️⃣ @noble/hashes | Hashing utilities |

---

## 📁 Project Structure

```
🔐 MedRef/
├── 🎨 frontend/                     React Native/Expo Mobile App
│   ├── 📱 app/                      Screens and pages
│   ├── 🧩 components/               Reusable UI components
│   ├── 🪝 hooks/                    Custom React hooks
│   ├── 🔌 services/                 API and utility services
│   ├── ⚙️ constants/                 App configuration
│   ├── 🖼️ assets/                   Images and media
│   ├── 📋 app.json                  Expo configuration
│   ├── 📦 package.json              Dependencies
│   └── ⚙️ tsconfig.json             TypeScript config
│
├── ⚙️ backend/                      Node.js/Express API
│   ├── 👨‍💻 src/                      Source code
│   │   ├── 📊 models/               Data models
│   │   ├── 🛣️ routes/               API endpoints
│   │   ├── 🎮 controllers/          Business logic
│   │   ├── 🚧 middleware/           Middleware
│   │   ├── 💼 services/             Services
│   │   └── 🚀 app.ts                App setup
│   ├── 🗄️ prisma/                   Database config
│   ├── 🔑 .env                      Environment variables
│   ├── 📦 package.json              Dependencies
│   └── ⚙️ tsconfig.json             TypeScript config
│
├── ⛓️ contracts/                    Hardhat Smart Contracts
│   ├── 📜 src/                      Solidity contracts
│   ├── 🚀 scripts/                  Deployment scripts
│   ├── 📦 deployments/              Deployment artifacts
│   ├── ⚙️ hardhat.config.ts         Hardhat config
│   ├── 🔑 .env                      Network credentials
│   └── 📦 package.json              Dependencies
│
├── 📦 package.json                  Root monorepo config
├── 📘 README.md                     Documentation
└── 🚫 .gitignore                    Git ignore rules
```

---

## 📋 Prerequisites

### ✅ Required
- ☑️ **Node.js** v18 or higher
- ☑️ **npm** v8 or higher
- ☑️ **Git** for version control

### 📦 Optional
- 🤖 **Android Studio** for Android development
- 🍎 **Xcode** for iOS development (macOS only)
- 🦊 **MetaMask** for blockchain testing
- 🗄️ **PostgreSQL/MySQL** for backend database

---

## 🚀 Installation & Setup

### 1️⃣ Clone and Navigate
```bash
cd MedRef
```

### 2️⃣ Frontend Setup

```bash
cd frontend

# 📦 Install dependencies
npm install

# 🔑 Create configuration
cp .env.example .env

# ▶️ Start development
npm start

# Or run on specific platform
npm run android      # 🤖 Android
npm run ios         # 🍎 iOS
npm run web         # 🌐 Web
```

### 3️⃣ Backend Setup

```bash
cd backend

# 📦 Install dependencies
npm install

# 🔑 Setup configuration
cp .env.example .env
# Configure your database and secrets

# 🗄️ Run database setup
npx prisma migrate dev

# ▶️ Start server
npm run dev
```

### 4️⃣ Smart Contracts Setup

```bash
cd contracts

# 📦 Install dependencies
npm install

# 🔑 Setup configuration
cp .env.example .env
# Configure your network credentials

# 🔨 Compile contracts
npm run compile

# 🚀 Deploy to testnet
npm run deploy
```

---

## 🔑 Environment Configuration

### Frontend (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=ws://localhost:3000
```

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/app
JWT_SECRET=your_secret_key
PORT=3000
NODE_ENV=development
```

### Contracts (`contracts/.env`)
```env
PRIVATE_KEY=your_wallet_key
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology/
DEPLOYER_ADDRESS=your_wallet_address
```

---

## 📦 Running the Project

### ▶️ All Services (from root)

```bash
# 🎨 Frontend
npm run frontend:start

# In another terminal - ⚙️ Backend
npm run backend:dev

# In another terminal - ⛓️ Contracts
npm run contracts:compile
```

### ▶️ Individual Services

**🎨 Frontend:**
```bash
cd frontend && npm start
```

**⚙️ Backend:**
```bash
cd backend && npm run dev
```

**⛓️ Contracts:**
```bash
cd contracts && npm run compile && npm run deploy
```

---

## 📱 Mobile App Development

### Available Scripts
```bash
cd frontend

npm start         # ▶️ Start dev server
npm run android   # 🤖 Android emulator
npm run ios       # 🍎 iOS simulator
npm run web       # 🌐 Web browser
npm run lint      # 🧹 Code linting
```

---

## 🧪 Testing

### 🎨 Frontend
```bash
cd frontend && npm test
```

### ⚙️ Backend
```bash
cd backend && npm test
```

### ⛓️ Smart Contracts
```bash
cd contracts && npm run test
```

---

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt)
- ✅ HTTPS ready
- ✅ Blockchain integration
- ✅ Role-based access control
- ✅ Environment variable protection
- ✅ Input validation
- ✅ CORS configuration

---

## 📚 Documentation References

- 📖 [Expo Documentation](https://docs.expo.dev/)
- 📖 [React Native Documentation](https://reactnative.dev/docs/getting-started)
- 📖 [Express.js Guide](https://expressjs.com/)
- 📖 [Prisma Documentation](https://www.prisma.io/docs/)
- 📖 [Hardhat Documentation](https://hardhat.org/docs)
- 📖 [Polygon Network](https://polygon.technology/)

---

## 🤝 Contributing

1. 🌿 Create a feature branch: `git checkout -b feature/YourFeature`
2. ✏️ Commit changes: `git commit -m 'Add YourFeature'`
3. 📤 Push to branch: `git push origin feature/YourFeature`
4. 📥 Open a pull request

---

## 📄 Code Conventions

### 📝 Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use descriptive naming
- Add comments for complex logic

### 🔄 Git Commits
- Format: `type: description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 📂 File Organization
- One component per file
- Group related services
- Organize types separately
- Keep constants in dedicated files

---

## 📞 Support

For issues and questions:
1. ✅ Check existing documentation
2. ✅ Review code comments
3. ✅ Check API error responses
4. ✅ Verify environment configuration

---

## 📝 License

This project is licensed under the **MIT License** — see LICENSE file for details.

---

## ✅ Setup Checklist

- [ ] ✅ Install Node.js v18+
- [ ] ✅ Clone the repository
- [ ] ✅ Install dependencies (frontend, backend, contracts)
- [ ] ✅ Configure .env files
- [ ] ✅ Setup database
- [ ] ✅ Deploy contracts
- [ ] ✅ Test all modules
- [ ] ✅ Verify integrations

---

**Last Updated**: March 27, 2026
**Version**: 1.0.0
**Status**: 🚀 In Development
