import { CreateUserRequest, AuthResponse, User, JWTPayload } from 'shared';
export declare class AuthService {
    private static JWT_SECRET;
    private static JWT_ACCESS_TOKEN_EXPIRY;
    private static JWT_REFRESH_TOKEN_EXPIRY;
    static register(userData: CreateUserRequest): Promise<AuthResponse>;
    static login(username: string, password: string): Promise<AuthResponse & {
        refreshToken: string;
    }>;
    static logout(token: string): Promise<void>;
    static refreshToken(refreshToken: string): Promise<{
        token: string;
        refreshToken: string;
    }>;
    static getCurrentUser(userId: string): Promise<User>;
    static verifyToken(token: string): Promise<JWTPayload>;
    private static generateTokens;
    private static storeRefreshToken;
    static changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
//# sourceMappingURL=AuthService.d.ts.map