# Technical Specifications: Dog Walk Gamble

## Technology Stack

### Frontend Stack
- **React 18.2+** with TypeScript 5.0+
- **Vite 4.0+** for build tooling and dev server
- **TailwindCSS 3.3+** for utility-first styling
- **React Router 6.8+** for client-side routing
- **React Query 4.24+** for server state management
- **React Hook Form 7.43+** for form handling
- **Zod 3.20+** for client-side validation
- **Socket.io Client 4.6+** for real-time communication

### Backend Stack
- **Node.js 18+** with TypeScript 5.0+
- **Express 4.18+** for HTTP server
- **Prisma 4.11+** for database ORM and migrations
- **Redis 6.2+** for session management and caching
- **Socket.io 4.6+** for WebSocket communication
- **Joi 17.7+** for API input validation
- **bcrypt 5.1+** for password hashing
- **jsonwebtoken 9.0+** for JWT authentication

### Database & Infrastructure
- **PostgreSQL 14+** as primary database
- **Redis 6.2+** for caching and sessions
- **Coinbase Commerce API** for crypto payments
- **Vercel** for frontend hosting
- **Railway** for backend and database hosting

## Code Standards & Patterns

### TypeScript Configuration

**Strict Mode Settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Key Rules:**
- Never use `any` type - use `unknown` or proper typing
- All function parameters and returns must be typed
- Use interfaces for object shapes, types for unions
- Export types from dedicated `types.ts` files

### Frontend Patterns

**Component Structure:**
```typescript
// ComponentName.tsx
interface ComponentNameProps {
  requiredProp: string;
  optionalProp?: number;
  children?: React.ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  requiredProp,
  optionalProp = 0,
  children
}) => {
  // Hooks first
  const [state, setState] = useState<StateType>(initialValue);
  
  // Event handlers
  const handleEvent = useCallback((param: string) => {
    // Implementation
  }, [dependencies]);
  
  // Early returns for loading/error states
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  // Main render
  return (
    <div className="component-wrapper">
      {children}
    </div>
  );
};
```

**Custom Hooks Pattern:**
```typescript
// useGameSession.ts
interface GameSessionState {
  isPlaying: boolean;
  currentSecond: number;
  currentPayout: number;
  sessionId: string | null;
}

export const useGameSession = () => {
  const [state, setState] = useState<GameSessionState>(initialState);
  
  const startGame = useCallback(async (betAmount: number) => {
    // Implementation
  }, []);
  
  const cashOut = useCallback(async () => {
    // Implementation
  }, []);
  
  return {
    ...state,
    startGame,
    cashOut
  };
};
```

**Error Handling:**
```typescript
// Use React Error Boundaries for component errors
// Use try/catch with proper error types for async operations
try {
  const result = await apiCall();
  return result;
} catch (error) {
  if (error instanceof APIError) {
    // Handle specific API errors
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

### Backend Patterns

**Controller Structure:**
```typescript
// GameController.ts
export class GameController {
  static async startGame(req: AuthenticatedRequest, res: Response) {
    try {
      // Input validation
      const { betAmount } = await startGameSchema.validateAsync(req.body);
      
      // Business logic
      const session = await GameService.createSession(req.user.userId, betAmount);
      
      // Response
      res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      ErrorHandler.handle(error, res);
    }
  }
}
```

**Service Layer Pattern:**
```typescript
// GameService.ts
export class GameService {
  static async createSession(userId: string, betAmount: number): Promise<GameSessionResponse> {
    // Validate user can start game
    const canStart = await SessionManager.validateUserCanStartGame(userId);
    if (!canStart) {
      throw new BusinessError('User already has active game session');
    }
    
    // Create session with predetermined outcome
    const session = await SessionManager.createSession(userId, betAmount);
    
    // Log audit event
    await AuditLogger.logGameEvent(session.id, 'session_created', {
      userId,
      betAmount
    });
    
    return {
      sessionId: session.id,
      serverSeedHash: session.serverSeedHash,
      clientSeed: session.clientSeed,
      nonce: session.nonce,
      maxDuration: 30
    };
  }
}
```

**Database Access Pattern:**
```typescript
// UserRepository.ts
export class UserRepository {
  static async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }
  
  static async updateBalance(userId: string, amount: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { usdBalanceCents: { increment: amount } }
      });
      
      await tx.transaction.create({
        data: {
          userId,
          type: 'balance_update',
          usdAmount: amount,
          status: 'confirmed'
        }
      });
    });
  }
}
```

### API Design Standards

**Request/Response Format:**
```typescript
// Standard API Response
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Error Response
interface APIError {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'BUSINESS_ERROR' | 'SYSTEM_ERROR';
    message: string;
    details?: Record<string, any>;
  };
}
```

**Validation Schemas:**
```typescript
// Joi schemas for input validation
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  ageConfirmed: Joi.boolean().valid(true).required()
});

const betSchema = Joi.object({
  betAmount: Joi.number().integer().min(500).max(10000000).required() // 500 cents to $100k
});
```

### Database Design Patterns

**Prisma Schema Conventions:**
```prisma
model User {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  username          String   @unique @db.VarChar(50)
  email             String   @unique @db.VarChar(255)
  passwordHash      String   @map("password_hash") @db.VarChar(255)
  usdBalanceCents   Int      @default(0) @map("usd_balance_cents")
  isAgeVerified     Boolean  @default(false) @map("is_age_verified")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  transactions      Transaction[]
  gameSessions      GameSession[]
  cosmetics         UserCosmetic[]
  
  @@map("users")
}
```

**Migration Strategy:**
- Always use Prisma migrations for schema changes
- Include both `up` and `down` migration paths
- Test migrations on production-like data
- Never edit existing migrations
- Use descriptive migration names

### Security Implementation

**Authentication Middleware:**
```typescript
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'No token provided' }
      });
    }
    
    // Check token blacklist
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' }
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
    });
  }
};
```

**Input Sanitization:**
```typescript
// Always validate and sanitize inputs
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Use parameterized queries (Prisma handles this automatically)
// Never concatenate user input into SQL strings
```

### Game Logic Implementation

**RNG System:**
```typescript
export class ProvablyFairRNG {
  static generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  static generateClientSeed(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  static createSeedHash(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }
  
  static determineSquirrelEvent(
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): number | null {
    const combinedSeed = crypto.createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');
    
    let hash = combinedSeed;
    
    for (let second = 1; second <= 30; second++) {
      hash = crypto.createHash('sha256').update(hash).digest('hex');
      const randomValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
      
      const squirrelChance = GAME_CONFIG.getRiskPerSecond(second);
      if (randomValue < squirrelChance) {
        return second;
      }
    }
    
    return null; // No squirrel event
  }
}
```

**Game Configuration:**
```typescript
export const GAME_CONFIG = {
  MIN_BET_CENTS: 500, // $5.00
  MAX_BET_CENTS: 10000000, // $100,000
  MAX_GAME_DURATION: 30,
  BASE_HOUSE_EDGE: 0.08,
  
  getRiskPerSecond: (second: number): number => {
    if (second <= 5) return 0.01;
    if (second <= 10) return 0.03;
    if (second <= 15) return 0.05;
    if (second <= 20) return 0.07;
    return 0.10;
  },
  
  getPayoutMultiplier: (seconds: number): number => {
    const baseMultiplier = 1 + (seconds * 0.15) + Math.pow(seconds * 0.1, 1.8);
    return Math.round(baseMultiplier * (1 - GAME_CONFIG.BASE_HOUSE_EDGE) * 100) / 100;
  }
} as const;
```

### Testing Patterns

**Unit Tests (Jest + Testing Library):**
```typescript
// Component testing
describe('GameScreen', () => {
  it('should start game when bet amount is valid', async () => {
    render(<GameScreen />);
    
    const betInput = screen.getByLabelText(/bet amount/i);
    const startButton = screen.getByRole('button', { name: /start game/i });
    
    await user.type(betInput, '10');
    await user.click(startButton);
    
    expect(screen.getByText(/game started/i)).toBeInTheDocument();
  });
});

// Service testing
describe('GameService', () => {
  it('should create valid game session', async () => {
    const session = await GameService.createSession('user-id', 1000);
    
    expect(session.sessionId).toBeDefined();
    expect(session.serverSeedHash).toHaveLength(64);
    expect(session.maxDuration).toBe(30);
  });
});
```

### Performance Optimization

**Database Optimization:**
```sql
-- Essential indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
```

**Caching Strategy:**
```typescript
// Redis caching patterns
export class CacheService {
  static async getUser(userId: string): Promise<User | null> {
    const cached = await redis.get(`user:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const user = await UserRepository.findById(userId);
    if (user) {
      await redis.setex(`user:${userId}`, 300, JSON.stringify(user)); // 5 min cache
    }
    
    return user;
  }
}
```

### Deployment Configuration

**Environment Variables:**
```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/dogwalk
REDIS_URL=redis://host:6379
JWT_SECRET=256-bit-secret
COINBASE_COMMERCE_API_KEY=key
COINBASE_WEBHOOK_SECRET=secret
NODE_ENV=production
PORT=3001

# Frontend
VITE_API_URL=https://api.dogwalkgamble.com
VITE_WS_URL=wss://api.dogwalkgamble.com
```

**Build Configuration:**
```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter backend dev\" \"pnpm --filter frontend dev\"",
    "build": "pnpm --filter backend build && pnpm --filter frontend build",
    "test": "pnpm --filter backend test && pnpm --filter frontend test",
    "lint": "pnpm --filter backend lint && pnpm --filter frontend lint",
    "type-check": "pnpm --filter backend type-check && pnpm --filter frontend type-check"
  }
}
```

These technical specifications ensure consistent, maintainable, and secure code across the entire Dog Walk Gamble application. 