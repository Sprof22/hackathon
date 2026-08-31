import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import nodemailer from "nodemailer";
import { Repository } from "typeorm";
import { NotificationDelivery } from "./entities/notification-delivery.entity";

@Injectable()
export class NotificationService {
  constructor(
    private config: ConfigService,
    @InjectRepository(NotificationDelivery) private deliveries: Repository<NotificationDelivery>
  ) {}

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    organizationId: string,
    context: { actionItemId?: string; reminderId?: string } = {}
  ) {
    const delivery = this.deliveries.create({
      organizationId,
      actionItemId: context.actionItemId ?? null,
      reminderId: context.reminderId ?? null,
      channel: "email",
      recipient: to,
      subject,
      body,
      status: "captured",
    });
    if (this.config.get("EMAIL_MODE", "capture") !== "smtp") return this.deliveries.save(delivery);
    try {
      const transport = nodemailer.createTransport({
        host: this.config.getOrThrow("SMTP_HOST"),
        port: Number(this.config.get("SMTP_PORT", 587)),
        secure: Number(this.config.get("SMTP_PORT", 587)) === 465,
        auth: {
          user: this.config.getOrThrow("SMTP_USER"),
          pass: this.config.getOrThrow("SMTP_PASS"),
        },
      });
      await transport.sendMail({
        from: this.config.get("SMTP_FROM", "LoopClose <notifications@example.com>"),
        to,
        subject,
        text: body,
      });
      delivery.status = "sent";
    } catch (error) {
      delivery.status = "failed";
      delivery.error = error instanceof Error ? error.message : "Email failed";
    }
    return this.deliveries.save(delivery);
  }
}
