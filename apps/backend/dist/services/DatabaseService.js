"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.DatabaseService = void 0;
const client_1 = require("@prisma/client");
class DatabaseServiceClass {
    constructor() {
        this.prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
            errorFormat: 'minimal',
        });
        // Handle connection events
        this.prisma.$on('beforeExit', async () => {
            console.log('Prisma disconnecting...');
        });
    }
    static getInstance() {
        if (!DatabaseServiceClass.instance) {
            DatabaseServiceClass.instance = new DatabaseServiceClass();
        }
        return DatabaseServiceClass.instance;
    }
    async connect() {
        try {
            await this.prisma.$connect();
            console.log('✅ Database connected successfully');
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.prisma.$disconnect();
            console.log('✅ Database disconnected successfully');
        }
        catch (error) {
            console.error('❌ Database disconnection failed:', error);
            throw error;
        }
    }
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
    // Transaction wrapper
    async transaction(fn) {
        return this.prisma.$transaction(fn);
    }
}
exports.DatabaseService = DatabaseServiceClass.getInstance();
exports.prisma = exports.DatabaseService.prisma;
//# sourceMappingURL=DatabaseService.js.map