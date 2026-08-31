import { Body, Controller, Injectable, Post, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsEmail, IsString, MinLength } from "class-validator";
import { compare, hash } from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { DataSource, Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import { Organization, Role, User } from "./entities";
import { Public } from "./auth.guard";

class RegisterDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) organizationName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private dataSource: DataSource,
    private jwt: JwtService
  ) {}
  async register(dto: RegisterDto) {
    const exists = await this.users.findOneBy({ email: dto.email.toLowerCase() });
    if (exists) throw new UnauthorizedException("An account with that email already exists");
    const base =
      dto.organizationName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "workspace";
    const passwordHash = await hash(dto.password, 12);
    return this.dataSource.transaction(async (manager) => {
      const organizations = manager.getRepository(Organization);
      const users = manager.getRepository(User);
      const organization = await organizations.save(
        organizations.create({
          name: dto.organizationName.trim(),
          slug: `${base}-${randomUUID().slice(0, 8)}`,
        })
      );
      const user = await users.save(
        users.create({
          organizationId: organization.id,
          name: dto.name.trim(),
          email: dto.email.toLowerCase(),
          passwordHash,
          role: Role.OWNER,
        })
      );
      return this.issue(user);
    });
  }
  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder("u")
      .addSelect("u.passwordHash")
      .where("LOWER(u.email) = LOWER(:email)", { email: dto.email })
      .getOne();
    if (!user || !(await compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException("Invalid email or password");
    return this.issue(user);
  }
  private issue(user: User) {
    if (!user.organizationId)
      throw new UnauthorizedException("Account is not assigned to an organization");
    return {
      accessToken: this.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }
}

@Controller("auth")
@Public()
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post("register") register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @Post("login") login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
