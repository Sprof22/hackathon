import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Role } from "./entities";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export type AuthenticatedUser = { sub: string; email: string; role: Role; organizationId: string };
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user
);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector
  ) {}
  canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest();
    const [type, token] = (request.headers.authorization ?? "").split(" ");
    if (type !== "Bearer" || !token) throw new UnauthorizedException("Sign in required");
    try {
      const user = this.jwt.verify<AuthenticatedUser>(token);
      if (!user.organizationId) throw new Error("Missing organization");
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException("Session expired or invalid");
    }
  }
}
