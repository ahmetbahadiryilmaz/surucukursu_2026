import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { BaseUser, RequestWithUser } from './dto/types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        token: string;
        user: {
            id: number;
            email: string;
            name: string;
            userType: import("./dto/enum").UserTypes;
        };
    }>;
    me(req: RequestWithUser): Promise<BaseUser>;
    logout(req: RequestWithUser): Promise<{
        message: string;
    }>;
}
