import { PrismaClient } from '@prisma/client';
declare class DatabaseServiceClass {
    private static instance;
    prisma: PrismaClient;
    private constructor();
    static getInstance(): DatabaseServiceClass;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T>;
}
export declare const DatabaseService: DatabaseServiceClass;
export declare const prisma: any;
export {};
//# sourceMappingURL=DatabaseService.d.ts.map