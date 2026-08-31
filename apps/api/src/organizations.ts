import { Body, Controller, ForbiddenException, Get, Injectable, OnApplicationBootstrap, Patch } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsString, MinLength } from "class-validator";
import { Repository } from "typeorm";
import { CurrentUser, AuthenticatedUser } from "./auth.guard";
import { ActionItem, Meeting, NotificationDelivery, Organization, QaNotification, Reminder, Role, StatusEvent, User } from "./entities";

class UpdateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

@Injectable()
export class OrganizationBootstrapService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Organization) private organizations:Repository<Organization>,
    @InjectRepository(User) private users:Repository<User>,
    @InjectRepository(Meeting) private meetings:Repository<Meeting>,
    @InjectRepository(ActionItem) private items:Repository<ActionItem>,
    @InjectRepository(StatusEvent) private events:Repository<StatusEvent>,
    @InjectRepository(Reminder) private reminders:Repository<Reminder>,
    @InjectRepository(QaNotification) private qa:Repository<QaNotification>,
    @InjectRepository(NotificationDelivery) private deliveries:Repository<NotificationDelivery>,
  ) {}

  async onApplicationBootstrap() {
    let organization=await this.organizations.findOneBy({slug:"loopclose-demo"});
    if(!organization){try{organization=await this.organizations.save(this.organizations.create({name:"LoopClose Demo",slug:"loopclose-demo"}));}catch{organization=await this.organizations.findOneByOrFail({slug:"loopclose-demo"});}}
    const repositories=[this.users,this.meetings,this.items,this.events,this.reminders,this.qa,this.deliveries];
    for(const repository of repositories){
      await repository.createQueryBuilder().update().set({organizationId:organization.id}).where('"organizationId" IS NULL').execute();
    }
    const ownerCount=await this.users.count({where:{organizationId:organization.id,role:Role.OWNER}});
    if(ownerCount===0){const firstUser=await this.users.findOne({where:{organizationId:organization.id},order:{createdAt:"ASC"}});if(firstUser){firstUser.role=Role.OWNER;await this.users.save(firstUser);}}
  }
}

@Controller("organization")
export class OrganizationController {
  constructor(@InjectRepository(Organization) private organizations:Repository<Organization>,@InjectRepository(User) private users:Repository<User>) {}

  @Get()
  current(@CurrentUser() user:AuthenticatedUser){return this.organizations.findOneByOrFail({id:user.organizationId});}

  @Get("members")
  members(@CurrentUser() user:AuthenticatedUser){return this.users.find({where:{organizationId:user.organizationId},order:{createdAt:"ASC"}});}

  @Patch()
  async update(@CurrentUser() user:AuthenticatedUser,@Body() dto:UpdateOrganizationDto){
    if(user.role!==Role.OWNER) throw new ForbiddenException("Only an organization owner can update the workspace");
    const organization=await this.organizations.findOneByOrFail({id:user.organizationId});
    organization.name=dto.name.trim();
    return this.organizations.save(organization);
  }
}
