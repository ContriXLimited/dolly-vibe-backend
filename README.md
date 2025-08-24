# Dolly Vibe Backend

A comprehensive NestJS backend application for the Dolly Vibe platform, featuring blockchain integration, user authentication, NFT management, and social features.

## 🚀 Features

- **User Management**: Complete user registration, authentication, and profile management
- **Blockchain Integration**: Web3 wallet connectivity and blockchain interactions
- **NFT System**: Vibe Pass minting, iNFT (Identity Asset) management, metadata management, and NFT operations
- **Social Features**: Discord and Twitter OAuth integration
- **Leaderboard System**: User scoring and ranking functionality
- **Profile Updates**: Dynamic profile update tracking and scoring
- **Health Monitoring**: Application health checks and monitoring
- **API Documentation**: Comprehensive OpenAPI/Swagger documentation

## 🛠️ Tech Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: JWT + Passport
- **Blockchain**: Ethers.js + 0G Labs SDK + iNFT (ERC-7857) smart contract integration
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Language**: TypeScript

## 📦 Core Modules

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, User)
- Wallet signature verification
- Social OAuth (Discord, Twitter)

### Blockchain Integration
- Smart contract interactions via Ethers.js
- Agent NFT management and iNFT (Identity Asset) support
- User on-chain behavior, community contributions, and social interactions data integration with NFTs
- Metadata encryption and storage services
- NFT transfer management
- 0G Labs decentralized storage integration

### User Features
- User profile management
- Wallet connection and verification
- Social account linking
- Activity tracking and scoring

### NFT System (Vibe Pass & iNFT)
- **Vibe Pass**: NFT minting with metadata and project joining functionality
- **iNFT (Identity Asset)**: Smart identity NFTs based on ERC-7857 standard
  - Transform user on-chain behavior, community contributions, and social interactions into verifiable digital identity assets
  - Build portable and tradeable identity reputation system
- Agent NFT client with identity data metadata management
- Encrypted metadata storage and transmission
- Mint parameter generation and signature verification
- Metadata upload to 0G Labs decentralized storage

### Leaderboard & Scoring
- User ranking system
- Score calculation and tracking
- Leaderboard queries with pagination
- Achievement tracking

## 🏗️ Project Structure

```
src/
├── auth/                 # Authentication & authorization
├── blockchain/           # Web3 & smart contract integration
├── common/              # Shared utilities & modules
│   ├── decorators/      # Custom decorators
│   ├── guards/          # Route guards
│   ├── prisma/          # Database service
│   └── redis/           # Cache service
├── health/              # Health check endpoints
├── leaderboard/         # User ranking system
├── profile-update/      # Profile update tracking
├── social/              # Social OAuth integration
├── vibe-pass/           # Vibe Pass and iNFT minting & management
├── vibe-user/           # User management
└── wallet/              # Wallet verification
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- npm/pnpm/yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd dolly-vibe-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start the development server
```bash
npm run start:dev
```

The server will be available at `http://localhost:3000`

## 📚 Available Scripts

### Development
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build the application
- `npm run start:prod` - Start in production mode

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed the database

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Documentation & Tools
- `npm run openapi:generate` - Generate OpenAPI documentation
- `npm run db:test` - Test database connection
- `npm run script:create-vibe-project` - Create vibe project

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```bash
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# JWT
JWT_SECRET="your-secret-key"

# Blockchain
ETHEREUM_RPC_URL="..."
CONTRACT_ADDRESS="..."

# Social OAuth
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
TWITTER_CONSUMER_KEY="..."
TWITTER_CONSUMER_SECRET="..."

# 0G Labs
ZG_STORAGE_URL="..."
```

## 📖 API Documentation

Once the application is running, you can access:

- **Swagger UI**: `http://localhost:3000/api`
- **OpenAPI JSON**: `http://localhost:3000/api-json`
- **OpenAPI YAML**: Available in the project root as `openapi.yaml`

## 🔐 Security Features

- JWT authentication with configurable expiration
- Role-based access control (RBAC)
- Wallet signature verification
- Input validation with class-validator
- Rate limiting and security headers
- Environment variable validation

## 🐳 Docker Support

The project includes multiple Dockerfile configurations:

- `Dockerfile` - Standard production build
- `Dockerfile.optimized` - Optimized for smaller image size
- `Dockerfile.debug` - Debug-enabled build
- `docker-compose.yml` - Complete development environment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Test Structure

- Unit tests: `src/**/*.spec.ts`
- E2E tests: `test/**/*.e2e-spec.ts`
- Test utilities: `test/` directory

## 📁 Demo Examples

The project includes HTML demos in the `example/` directory:

- `vibe-pass-demo.html` - Vibe Pass minting demo
- `profile-update-demo.html` - Profile update functionality
- `three-step-mint-demo.html` - Three-step minting process

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

ISC License

## 🆘 Support

For support and troubleshooting, refer to:

- `TROUBLESHOOTING.md` - Common issues and solutions
- `API_CHANGES.md` - API change documentation
- `DEPLOYMENT.md` - Deployment guidelines

---

Built with ❤️ using NestJS and modern web technologies.