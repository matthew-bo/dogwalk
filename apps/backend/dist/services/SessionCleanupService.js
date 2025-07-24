"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionCleanupService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const GameService_1 = require("@/services/GameService");
class SessionCleanupServiceClass {
    constructor() {
        this.cronJob = null;
    }
    static getInstance() {
        if (!SessionCleanupServiceClass.instance) {
            SessionCleanupServiceClass.instance = new SessionCleanupServiceClass();
        }
        return SessionCleanupServiceClass.instance;
    }
    start() {
        if (this.cronJob) {
            console.warn('Session cleanup service is already running');
            return;
        }
        // Run cleanup every minute
        this.cronJob = node_cron_1.default.schedule('* * * * *', async () => {
            try {
                await GameService_1.GameService.cleanupAbandonedSessions();
            }
            catch (error) {
                console.error('Error during session cleanup:', error);
            }
        });
        console.log('✅ Session cleanup service started');
    }
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log('✅ Session cleanup service stopped');
        }
    }
    async runCleanupNow() {
        try {
            await GameService_1.GameService.cleanupAbandonedSessions();
            console.log('✅ Manual session cleanup completed');
        }
        catch (error) {
            console.error('❌ Manual session cleanup failed:', error);
            throw error;
        }
    }
}
exports.SessionCleanupService = SessionCleanupServiceClass.getInstance();
//# sourceMappingURL=SessionCleanupService.js.map