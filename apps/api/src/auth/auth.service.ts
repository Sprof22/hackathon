import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { compare, hash } from "bcrypt";
import { randomUUID } from "node:crypto";
import { DataSource, Repository } from "typeorm";
import { Organization } from "../organizations/entities/organization.entity";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { Role, User } from "./entities/user.entity";

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
