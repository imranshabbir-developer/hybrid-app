import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Please sign in');
    }
    return user;
  }
}

export type AuthRequestUser = {
  userId: string;
  email: string;
  role: 'ADMIN' | 'COMPANY';
  companyId: string | null;
  companyCode: string | null;
};

export function getAuthUser(context: ExecutionContext): AuthRequestUser {
  const req = context.switchToHttp().getRequest<{ user: AuthRequestUser }>();
  return req.user;
}
