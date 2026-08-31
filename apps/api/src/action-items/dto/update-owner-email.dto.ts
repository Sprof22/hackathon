import { IsEmail } from "class-validator";

export class UpdateOwnerEmailDto {
  @IsEmail() email!: string;
}
