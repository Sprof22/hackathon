import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { Reminder } from "./entities/reminder.entity";

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(Reminder) private reminders: Repository<Reminder>,
    @InjectRepository(ActionItem) private items: Repository<ActionItem>
  ) {}

  async draft(actionItemId: string, organizationId: string) {
    const item = await this.items.findOneByOrFail({ id: actionItemId, organizationId });
    if (!item.ownerEmail) throw new Error("Add the owner's email before drafting a reminder");
    const existing = await this.reminders.findOne({
      where: { actionItemId, organizationId, approved: false },
      order: { createdAt: "DESC" },
    });
    if (existing) return existing;
    return this.reminders.save(
      this.reminders.create({
        organizationId,
        actionItemId: item.id,
        recipientEmail: item.ownerEmail,
        subject: `Quick check-in: ${item.task}`,
        emailBody: `Hi ${item.ownerName},\n\nA quick check-in on “${item.task}.” The original commitment was: “${item.sourceQuote}”\n\nCould you share whether this is done, in progress, or blocked?\n\nThanks,\nLoopClose`,
      })
    );
  }
}
