import { Body, Controller, ForbiddenException, Get, Patch } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Role, User } from "../auth/entities/user.entity";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { Organization } from "./entities/organization.entity";

@Controller("organization")
export class OrganizationsController {
  constructor(
    @InjectRepository(Organization) private organizations: Repository<Organization>,
    @InjectRepository(User) private users: Repository<User>
  ) {}

  @Get()
  current(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.findOneByOrFail({ id: user.organizationId });
  }

  @Get("members")
  members(@CurrentUser() user: AuthenticatedUser) {
    return this.users.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: "ASC" },
    });
  }

  @Patch()
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganizationDto) {
    if (user.role !== Role.OWNER)
      throw new ForbiddenException("Only an organization owner can update the workspace");
    const organization = await this.organizations.findOneByOrFail({ id: user.organizationId });
    organization.name = dto.name.trim();
    return this.organizations.save(organization);
  }
}
