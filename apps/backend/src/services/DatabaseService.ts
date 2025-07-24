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

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
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