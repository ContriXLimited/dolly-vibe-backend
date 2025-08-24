# Dolly Vibe Backend

Dolly Vibe 平台的综合 NestJS 后端应用程序，具备区块链集成、用户认证、NFT 管理和社交功能。

## 🚀 功能特性

- **用户管理**: 完整的用户注册、认证和个人资料管理
- **区块链集成**: Web3 钱包连接和区块链交互
- **NFT 系统**: Vibe Pass 铸造、iNFT（智能身份资产化）管理、元数据管理和 NFT 操作
- **社交功能**: Discord 和 Twitter OAuth 集成
- **排行榜系统**: 用户评分和排名功能
- **个人资料更新**: 动态个人资料更新跟踪和评分
- **健康监控**: 应用程序健康检查和监控
- **API 文档**: 全面的 OpenAPI/Swagger 文档

## 🛠️ 技术栈

- **框架**: NestJS 10.x
- **数据库**: PostgreSQL 配合 Prisma ORM
- **缓存**: Redis
- **认证**: JWT + Passport
- **区块链**: Ethers.js + 0G Labs SDK + iNFT（ERC-7857）智能合约集成
- **文档**: Swagger/OpenAPI
- **测试**: Jest
- **语言**: TypeScript

## 📦 核心模块

### 认证与授权
- 基于 JWT 的认证
- 基于角色的访问控制（管理员、用户）
- 钱包签名验证
- 社交 OAuth（Discord、Twitter）

### 区块链集成
- 通过 Ethers.js 进行智能合约交互
- Agent NFT 管理和 iNFT（智能身份资产化）支持
- 用户链上行为、社区贡献、社交互动数据与 NFT 集成
- 元数据加密和存储服务
- NFT 转移管理
- 0G Labs 去中心化存储集成

### 用户功能
- 用户个人资料管理
- 钱包连接和验证
- 社交账户链接
- 活动跟踪和评分

### NFT 系统（Vibe Pass & iNFT）
- **Vibe Pass**: 带元数据的 NFT 铸造和项目加入功能
- **iNFT（智能身份资产化）**: 基于 ERC-7857 标准的智能身份 NFT
  - 将用户链上行为、社区贡献、社交互动转化为可验证的数字身份资产
  - 构建可携带、可交易的身份信誉系统
- Agent NFT 客户端，支持身份数据元数据管理
- 加密元数据存储和传输
- 铸造参数生成和签名验证
- 元数据上传到 0G Labs 去中心化存储

### 排行榜与评分
- 用户排名系统
- 分数计算和跟踪
- 带分页的排行榜查询
- 成就跟踪

## 🏗️ 项目结构

```
src/
├── auth/                 # 认证和授权
├── blockchain/           # Web3 和智能合约集成
├── common/              # 共享工具和模块
│   ├── decorators/      # 自定义装饰器
│   ├── guards/          # 路由守卫
│   ├── prisma/          # 数据库服务
│   └── redis/           # 缓存服务
├── health/              # 健康检查端点
├── leaderboard/         # 用户排名系统
├── profile-update/      # 个人资料更新跟踪
├── social/              # 社交 OAuth 集成
├── vibe-pass/           # Vibe Pass 和 iNFT 铸造管理
├── vibe-user/           # 用户管理
└── wallet/              # 钱包验证
```

## 🚦 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL
- Redis
- npm/pnpm/yarn

### 安装

1. 克隆仓库
```bash
git clone <repository-url>
cd dolly-vibe-backend
```

2. 安装依赖
```bash
npm install
```

3. 设置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件配置
```

4. 设置数据库
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. 启动开发服务器
```bash
npm run start:dev
```

服务器将在 `http://localhost:3000` 可用

## 📚 可用脚本

### 开发
- `npm run start:dev` - 以开发模式启动（热重载）
- `npm run start:debug` - 以调试模式启动
- `npm run build` - 构建应用程序
- `npm run start:prod` - 以生产模式启动

### 数据库
- `npm run prisma:generate` - 生成 Prisma 客户端
- `npm run prisma:migrate` - 运行数据库迁移
- `npm run prisma:studio` - 打开 Prisma Studio
- `npm run prisma:seed` - 填充数据库

### 测试
- `npm run test` - 运行单元测试
- `npm run test:watch` - 以监视模式运行测试
- `npm run test:cov` - 运行带覆盖率的测试
- `npm run test:e2e` - 运行端到端测试

### 代码质量
- `npm run lint` - 运行 ESLint
- `npm run format` - 使用 Prettier 格式化代码

### 文档与工具
- `npm run openapi:generate` - 生成 OpenAPI 文档
- `npm run db:test` - 测试数据库连接
- `npm run script:create-vibe-project` - 创建 vibe 项目

## 🔧 配置

### 环境变量

需要配置的关键环境变量：

```bash
# 数据库
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# JWT
JWT_SECRET="your-secret-key"

# 区块链
ETHEREUM_RPC_URL="..."
CONTRACT_ADDRESS="..."

# 社交 OAuth
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
TWITTER_CONSUMER_KEY="..."
TWITTER_CONSUMER_SECRET="..."

# 0G Labs
ZG_STORAGE_URL="..."
```

## 📖 API 文档

应用程序运行后，可以访问：

- **Swagger UI**: `http://localhost:3000/api`
- **OpenAPI JSON**: `http://localhost:3000/api-json`
- **OpenAPI YAML**: 项目根目录的 `openapi.yaml` 文件

## 🔐 安全功能

- 可配置过期时间的 JWT 认证
- 基于角色的访问控制（RBAC）
- 钱包签名验证
- 使用 class-validator 进行输入验证
- 速率限制和安全头
- 环境变量验证

## 🐳 Docker 支持

项目包含多个 Dockerfile 配置：

- `Dockerfile` - 标准生产构建
- `Dockerfile.optimized` - 针对更小镜像大小优化
- `Dockerfile.debug` - 支持调试的构建
- `docker-compose.yml` - 完整的开发环境

```bash
# 使用 Docker Compose 构建和运行
docker-compose up -d
```

## 🧪 测试

### 运行测试

```bash
# 单元测试
npm run test

# 端到端测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

### 测试结构

- 单元测试：`src/**/*.spec.ts`
- 端到端测试：`test/**/*.e2e-spec.ts`
- 测试工具：`test/` 目录

## 📁 演示示例

项目在 `example/` 目录中包含 HTML 演示：

- `vibe-pass-demo.html` - Vibe Pass 铸造演示
- `profile-update-demo.html` - 个人资料更新功能
- `three-step-mint-demo.html` - 三步铸造流程

## 🤝 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 为新功能添加测试
5. 确保所有测试通过
6. 提交 pull request

## 📄 许可证

ISC License

## 🆘 支持

有关支持和故障排除，请参考：

- `TROUBLESHOOTING.md` - 常见问题和解决方案
- `API_CHANGES.md` - API 更改文档
- `DEPLOYMENT.md` - 部署指南

---

使用 NestJS 和现代 Web 技术构建 ❤️