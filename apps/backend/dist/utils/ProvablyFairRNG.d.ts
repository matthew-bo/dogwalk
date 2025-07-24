export declare class ProvablyFairRNG {
    static generateServerSeed(): string;
    static generateClientSeed(): string;
    static createSeedHash(seed: string): string;
    static determineSquirrelEvent(serverSeed: string, clientSeed: string, nonce: number): number | null;
    static verifyGameOutcome(serverSeed: string, clientSeed: string, nonce: number, claimedSquirrelTime: number | null): boolean;
    static calculateWinProbability(seconds: number): number;
    static calculateExpectedPayout(betAmount: number, seconds: number): number;
    static getHouseEdge(seconds: number): number;
    static generateProvableClientSeed(): string;
    static auditGameResult(serverSeed: string, serverSeedHash: string, clientSeed: string, nonce: number, outcome: {
        squirrelEventTime: number | null;
        cashoutTime?: number;
        result: 'win' | 'loss';
    }): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=ProvablyFairRNG.d.ts.map