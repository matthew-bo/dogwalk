import { PrismaClient } from '@prisma/client';

class DatabaseServiceClass {
  private static instance: DatabaseServiceClass;
  public prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'minimal',
    });

    // Handle connection events
    this.prisma.$on('beforeExit', async () => {
      console.log('Prisma disconnecting...');
    });
  }

  public static getInstance(): DatabaseServiceClass {
    if (!DatabaseServiceClass.instance) {
      DatabaseServiceClass.instance = new DatabaseServiceClass();
    }
    return DatabaseServiceClass.instance;
  }

  async connect(): Promise<void> {
    try {
      console.log('📦 Connecting to database...');
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      
      // In development, we can continue without database for basic functionality
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Continuing without database in development mode');
        console.warn('   - User registration/login will be disabled');
        console.warn('   - Game sessions will use memory storage');
        console.warn('   - Install PostgreSQL or use Docker for full functionality');
        return;
      }
      
      // In production, database is required
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Transaction wrapper
  public async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

export const DatabaseService = DatabaseServiceClass.getInstance();
export const prisma = DatabaseService.prisma; 