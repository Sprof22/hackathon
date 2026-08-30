import { Body, Controller, Injectable, Post, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsEmail, IsString, MinLength } from "class-validator";
import { compare, hash } from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { Role, User } from "./entities";
import { Public } from "./auth.guard";

class RegisterDto { @IsString() @MinLength(2) name!:string; @IsEmail() email!:string; @IsString() @MinLength(8) password!:string; }
class LoginDto { @IsEmail() email!:string; @IsString() password!:string; }

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private users:Repository<User>, private jwt:JwtService) {}
  async register(dto:RegisterDto) {
    const exists = await this.users.findOneBy({ email:dto.email.toLowerCase() });
    if (exists) throw new UnauthorizedException("An account with that email already exists");
    const user = await this.users.save(this.users.create({ name:dto.name, email:dto.email.toLowerCase(), passwordHash:await hash(dto.password,12), role:Role.MANAGER }));
    return this.issue(user);
  }
  async login(dto:LoginDto) {
    const user = await this.users.createQueryBuilder("u").addSelect("u.passwordHash").where("LOWER(u.email) = LOWER(:email)",{email:dto.email}).getOne();
    if (!user || !(await compare(dto.password,user.passwordHash))) throw new UnauthorizedException("Invalid email or password");
    return this.issue(user);
  }
  private issue(user:User) { return { accessToken:this.jwt.sign({ sub:user.id, email:user.email, role:user.role }), user:{id:user.id,name:user.name,email:user.email,role:user.role} }; }
}

@Controller("auth")
@Public()
export class AuthController {
  constructor(private auth:AuthService) {}
  @Post("register") register(@Body() dto:RegisterDto) { return this.auth.register(dto); }
  @Post("login") login(@Body() dto:LoginDto) { return this.auth.login(dto); }
}
