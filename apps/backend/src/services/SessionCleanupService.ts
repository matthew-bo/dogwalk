import cron from 'node-cron';
import { GameService } from '@/services/GameService';

class SessionCleanupServiceClass {
  private static instance: SessionCleanupServiceClass;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {}

  public static getInstance(): SessionCleanupServiceClass {
    if (!SessionCleanupServiceClass.instance) {
      SessionCleanupServiceClass.instance = new SessionCleanupServiceClass();
    }
    return SessionCleanupServiceClass.instance;
  }

  public start(): void {
    if (this.cronJob) {
      console.warn('Session cleanup service is already running');
      return;
    }

    // Run cleanup every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      try {
        await GameService.cleanupAbandonedSessions();
      } catch (error) {
        console.error('Error during session cleanup:', error);
      }
    });

    console.log('✅ Session cleanup service started');
  }

  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('✅ Session cleanup service stopped');
    }
  }

  public async runCleanupNow(): Promise<void> {
    try {
      await GameService.cleanupAbandonedSessions();
      console.log('✅ Manual session cleanup completed');
    } catch (error) {
      console.error('❌ Manual session cleanup failed:', error);
      throw error;
    }
  }
}

export const SessionCleanupService = SessionCleanupServiceClass.getInstance(); 