import { Role } from "../../auth/entities/user.entity";

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: Role;
  organizationId: string;
};
