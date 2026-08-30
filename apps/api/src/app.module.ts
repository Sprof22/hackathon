import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController, AuthService } from "./auth";
import { AppController } from "./app.controller";
import { ExtractionService, ReminderService, VerificationService } from "./agents";
import { ActionItem, Meeting, NotificationDelivery, QaNotification, Reminder, StatusEvent, User } from "./entities";
import { NotificationService } from "./notifications";
import { JwtAuthGuard } from "./auth.guard";

const entities=[User,Meeting,ActionItem,StatusEvent,Reminder,QaNotification,NotificationDelivery];
@Module({
  imports:[ConfigModule.forRoot({isGlobal:true}),TypeOrmModule.forRootAsync({inject:[ConfigService],useFactory:(config:ConfigService)=>({type:"postgres",url:config.getOrThrow("DATABASE_URL"),entities,synchronize:config.get("DB_SYNCHRONIZE","false")==="true",ssl:{rejectUnauthorized:false}})}),TypeOrmModule.forFeature(entities),JwtModule.registerAsync({global:true,inject:[ConfigService],useFactory:(config:ConfigService)=>({secret:config.get("JWT_SECRET","dev-only-change-me"),signOptions:{expiresIn:"12h"}})})],
  controllers:[AppController,AuthController],providers:[AuthService,ExtractionService,VerificationService,ReminderService,NotificationService,{provide:APP_GUARD,useClass:JwtAuthGuard}]
})
export class AppModule {}
