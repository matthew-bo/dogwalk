# Architecture Document: Dog Walk Gamble

## System Overview

Dog Walk Gamble is a real-money gambling web application built as a modern, scalable system with the following key architectural principles:

- **Separation of Concerns**: Frontend and backend are completely decoupled
- **Type Safety**: TypeScript across the entire stack
- **Security First**: Comprehensive audit trails and fraud prevention
- **Crypto Native**: USD-pegged balances with crypto settlements
- **Provably Fair**: Commit-reveal RNG system for transparency

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │───▶│   Express API    │───▶│   PostgreSQL    │
│   (Vercel)      │    │   (Railway)      │    │   (Railway)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         │              │     Redis       │             │
         │              │   (Railway)     │             │
         │              └─────────────────┘             │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Coinbase Commerce│
                    │   (External)    │
                    └─────────────────┘
```

## Component Architecture

### Frontend (React SPA)

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation
- React Query for state management
- WebSocket for real-time game updates

**Component Hierarchy:**
```
App
├── AuthProvider (Context)
├── Router
│   ├── LandingPage
│   ├── AuthModal (Login/Register)
│   ├── Dashboard
│   │   ├── BalanceCard
│   │   ├── DogSelector
│   │   └── GameHistory
│   ├── GameScreen
│   │   ├── GameCanvas
│   │   ├── GameControls
│   │   └── GameOverlay
│   ├── PaymentModal
│   └── ProfilePage
```

**Key Patterns:**
- **Context API**: Authentication state and user balance
- **Custom Hooks**: Game logic, payment handling, WebSocket connections
- **Component Composition**: Small, reusable components under 300 lines
- **Error Boundaries**: Graceful error handling and recovery

### Backend (Express API)

**Technology Stack:**
- Node.js with Express and TypeScript
- Prisma ORM for database access
- Redis for session management and caching
- JSON Web Tokens (JWT) for authentication
- Joi for input validation
- WebSocket for real-time updates

**Service Architecture:**
```
Controllers/
├── AuthController
├── GameController
├── PaymentController
└── UserController

Services/
├── AuthService
├── GameService
├── PaymentService
├── BalanceService
└── DisputeService

Utils/
├── GameRNG
├── SessionManager
├── PaymentManager
└── AuditLogger
```

**Key Patterns:**
- **Service Layer**: Business logic separated from HTTP handling
- **Middleware Chain**: Authentication, validation, rate limiting
- **Repository Pattern**: Database access abstraction
- **Event-Driven**: Game events trigger multiple side effects

### Database (PostgreSQL)

**Core Tables:**
- `users` - User accounts and profile data
- `transactions` - Financial transaction audit trail
- `game_sessions` - Individual game rounds with RNG data
- `user_cosmetics` - Unlocked visual customizations
- `disputes` - Support cases and resolutions
- `game_event_logs` - Detailed game interaction logs

**Key Design Principles:**
- **Referential Integrity**: Foreign keys and constraints
- **Audit Trail**: Complete transaction history
- **Performance**: Proper indexing for common queries
- **Compliance**: GDPR-ready soft deletes

## Data Flow

### Game Session Flow

1. **Game Start Request**
   ```
   Frontend → Backend → Redis (session) → Database (session record)
   ```

2. **Real-time Game Updates**
   ```
   Frontend ←→ WebSocket ←→ Backend ←→ Redis (game state)
   ```

3. **Cashout Request**
   ```
   Frontend → Backend → RNG verification → Database (result) → Balance update
   ```

### Payment Flow

1. **Deposit Request**
   ```
   Frontend → Backend → Coinbase Commerce → Webhook → Balance update
   ```

2. **Withdrawal Request**
   ```
   Frontend → Backend → Validation → Crypto transfer → Database update
   ```

## Security Architecture

### Authentication & Authorization

**JWT Token System:**
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry stored in Redis
- Token blacklisting for logout/security events

**Session Management:**
- Redis-based session storage
- Concurrent session limits
- Automatic session cleanup

### Game Security

**Provably Fair System:**
1. Server generates seed + client seed
2. Server commits to seed hash before game
3. Game outcome determined by combined seeds
4. Server seed revealed after game completion
5. Public verification available

**Anti-Fraud Measures:**
- Session timing validation
- Impossible action detection
- Rate limiting on all endpoints
- Comprehensive audit logging

### Financial Security

**Transaction Integrity:**
- Database transactions for balance updates
- Double-entry accounting principles
- Immutable transaction records
- Real-time balance verification

**Crypto Security:**
- Hot wallet with withdrawal limits
- Multi-signature for large transactions
- Address validation and whitelisting
- AML monitoring and reporting

## Scalability Considerations

### Horizontal Scaling

**Stateless Backend:**
- Session data in Redis, not memory
- Load balancer compatible
- Database connection pooling

**Caching Strategy:**
- Redis for frequently accessed data
- CDN for static assets
- Query result caching

### Performance Optimization

**Database:**
- Proper indexing strategy
- Query optimization
- Connection pooling
- Read replicas for reporting

**Frontend:**
- Code splitting and lazy loading
- Asset optimization
- Service worker caching
- WebSocket connection management

## Integration Points

### External Services

**Coinbase Commerce:**
- Webhook validation
- Payment status polling
- Error handling and retries

**Redis:**
- Session storage
- Rate limiting counters
- Game state caching

**Monitoring:**
- Application logs
- Error tracking
- Performance metrics
- Business intelligence

### API Design

**RESTful Principles:**
- Resource-based URLs
- HTTP status codes
- Consistent error formats
- API versioning strategy

**Real-time Updates:**
- WebSocket for game state
- Server-sent events for notifications
- Graceful degradation for connection issues

## Deployment Architecture

### Development Environment
- Local PostgreSQL and Redis
- Environment variable configuration
- Hot reloading for development
- Comprehensive test suite

### Production Environment
- **Frontend**: Vercel with global CDN
- **Backend**: Railway with auto-scaling
- **Database**: Railway managed PostgreSQL
- **Redis**: Railway managed Redis
- **Monitoring**: Built-in observability

### CI/CD Pipeline
- GitHub Actions for automation
- Automated testing and type checking
- Database migration validation
- Progressive deployment strategy

## Compliance & Legal

### Data Protection
- GDPR compliance ready
- Data encryption at rest and in transit
- Audit trails for all data access
- Right to deletion implementation

### Financial Compliance
- Transaction reporting capabilities
- AML monitoring hooks
- KYC integration points
- Responsible gambling tools

This architecture provides a solid foundation for a secure, scalable real-money gambling application while maintaining flexibility for future enhancements and regulatory requirements. 