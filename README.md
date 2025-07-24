# Dog Walk Gamble

A web-based real-money gambling game where players walk a cartoon dog through a park, risking their wager with every second they choose to keep walking. Built with TypeScript, React, Node.js, and PostgreSQL.

## Project Overview

Dog Walk Gamble combines visual appeal, high tension, and quick session play in a unique gambling format. Players start a walk with their chosen dog and can cash out at any time before a random squirrel event ends the round.

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript  
- **Database**: PostgreSQL + Prisma ORM
- **Payments**: Cryptocurrency via Coinbase Commerce API
- **Session Management**: Redis
- **Hosting**: Vercel (frontend) + Railway (backend + database)

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- pnpm (recommended) or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd dogwalk

# Install dependencies
pnpm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Set up database
cd apps/backend
pnpm db:setup
pnpm db:migrate

# Start development servers
pnpm dev
```

## Development

### Project Structure
```
dogwalk/
├── apps/
│   ├── frontend/          # React frontend application
│   └── backend/           # Node.js API server
├── packages/
│   ├── shared/            # Shared TypeScript types and utilities
│   └── database/          # Prisma schema and migrations
├── docs/                  # Project documentation
├── tasks/                 # Development tasks and requirements
└── fixes/                 # Bug fix documentation
```

### Key Development Patterns

- **Strict TypeScript**: No `any` types, comprehensive interfaces
- **Component Architecture**: Small, single-responsibility React components (<300 lines)
- **Database-First**: Prisma schema drives API design
- **Test-Driven Development**: Write tests before implementation
- **Crypto-First Payments**: USD-pegged balances with crypto settlements

### Environment Configuration

#### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dogwalk
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-256-bit-secret
COINBASE_COMMERCE_API_KEY=your-coinbase-api-key
COINBASE_WEBHOOK_SECRET=webhook-secret
NODE_ENV=development
PORT=3001
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Dog Walk Gamble
```

## Game Mechanics

### Risk/Reward System
- **House Edge**: 8% target
- **Game Duration**: 10-30 seconds typical
- **Payout Curve**: Exponential growth with escalating risk
- **RNG**: Provably fair commit-reveal system

### Fairness & Transparency
- Server seed commitment before game start
- Client seed generation for randomness
- Public verification of all game outcomes
- Complete audit trail for disputes

## Security

### Key Security Features
- JWT authentication with Redis blacklisting
- Input validation and sanitization
- Rate limiting and fraud detection
- Secure random number generation
- Comprehensive audit logging

### Compliance
- Age verification (21+) on signup
- KYC integration ready (Veriff/Onfido/Persona)
- Responsible gambling tools
- GDPR/CCPA data handling compliance
- Anti-money laundering (AML) monitoring

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration with age verification
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Current user profile

### Game Flow
- `POST /api/game/start` - Start new game session
- `POST /api/game/cashout` - Cash out current game
- `GET /api/game/history` - Game history and statistics
- `GET /api/game/verify/:sessionId` - Verify game fairness

### Payments
- `POST /api/payments/deposit` - Create crypto deposit
- `POST /api/payments/withdraw` - Process crypto withdrawal
- `GET /api/payments/transactions` - Transaction history

## Deployment

### Production Environment
- **Frontend**: Vercel with automatic deployments
- **Backend**: Railway with PostgreSQL and Redis
- **Monitoring**: Built-in logging and error tracking
- **SSL**: Automatic HTTPS with custom domain support

### CI/CD Pipeline
- Automated testing on pull requests
- Type checking and linting
- Database migration validation
- Environment-specific deployments

## Contributing

1. Check existing tasks in `tasks/tasks.md`
2. Review architecture guidelines in `docs/architecture.md`
3. Follow coding standards in `docs/technical.md`
4. Update documentation for any architectural changes
5. Write tests for new features
6. Update `docs/status.md` with progress

## Legal & Compliance

⚠️ **Important**: This application involves real-money gambling and cryptocurrency transactions. Ensure compliance with local laws and regulations before deployment. Consult legal counsel for licensing requirements in your target jurisdictions.

## Support

- **Documentation**: See `docs/` directory for detailed specifications
- **Issues**: Check `fixes/` directory for known issues and solutions
- **Development**: Follow guidelines in `.cursorrules`

## License

[Specify license - typically proprietary for gambling applications]