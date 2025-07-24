import cron from 'node-cron';
import { GameService } from './GameService';
import { DatabaseService } from './DatabaseService';

class SessionCleanupServiceClass {
  private cleanupTask: cron.ScheduledTask | null = null;

  public start(): void {
    console.log('✅ Session cleanup service started');
    
    // Only run cleanup if database is available
    this.cleanupTask = cron.schedule('*/5 * * * *', async () => {
      try {
        // Check if database is connected before attempting cleanup
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Skipping session cleanup - database not available in development mode');
          return;
        }
        
        console.log('🧹 Running session cleanup...');
        await GameService.cleanupAbandonedSessions();
        console.log('✅ Session cleanup completed');
      } catch (error) {
        console.error('❌ Session cleanup failed:', error);
      }
    });
  }

  public stop(): void {
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.cleanupTask = null;
      console.log('🛑 Session cleanup service stopped');
    }
  }
}

export const SessionCleanupService = new SessionCleanupServiceClass(); 