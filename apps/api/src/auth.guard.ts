import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";

export const IS_PUBLIC_KEY="isPublic";
export const Public=()=>SetMetadata(IS_PUBLIC_KEY,true);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt:JwtService,private reflector:Reflector) {}
  canActivate(context:ExecutionContext) {
    if(this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[context.getHandler(),context.getClass()])) return true;
    const request=context.switchToHttp().getRequest();
    const [type,token]=(request.headers.authorization??"").split(" ");
    if(type!=="Bearer"||!token) throw new UnauthorizedException("Sign in required");
    try { request.user=this.jwt.verify(token); return true; } catch { throw new UnauthorizedException("Session expired or invalid"); }
  }
}
