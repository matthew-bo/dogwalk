declare class SessionCleanupServiceClass {
    private static instance;
    private cronJob;
    private constructor();
    static getInstance(): SessionCleanupServiceClass;
    start(): void;
    stop(): void;
    runCleanupNow(): Promise<void>;
}
export declare const SessionCleanupService: SessionCleanupServiceClass;
export {};
//# sourceMappingURL=SessionCleanupService.d.ts.map