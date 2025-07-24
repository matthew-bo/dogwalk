import { User, UserCosmetic, DogBreed, Leaderboard } from 'shared';
export declare class UserService {
    static getUserProfile(userId: string): Promise<{
        user: User;
        statistics: {
            totalGames: number;
            totalWins: number;
            totalLosses: number;
            winRate: number;
            totalWagered: number;
            totalWinnings: number;
            longestWalk: number;
            biggestWin: number;
        };
    }>;
    static updateUserProfile(userId: string, updates: {
        email?: string;
        currentPassword?: string;
        newPassword?: string;
    }): Promise<User>;
    static getUserCosmetics(userId: string): Promise<{
        unlockedCosmetics: UserCosmetic[];
        availableDogBreeds: DogBreed[];
        selectedDogBreed: string;
    }>;
    static getLeaderboard(period: 'daily' | 'weekly' | 'all-time', limit: number): Promise<Leaderboard>;
    private static checkUnlockRequirement;
    private static getTimeFilter;
}
//# sourceMappingURL=UserService.d.ts.map