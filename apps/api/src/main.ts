import "reflect-metadata";
import "pg";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { IncomingMessage, ServerResponse } from "node:http";
import { AppModule } from "./app.module";

let appPromise: ReturnType<typeof createApp> | undefined;

async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api", { exclude: [{ path:"", method:RequestMethod.GET }] });
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"], credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

function getApp() {
  appPromise ??= createApp();
  return appPromise;
}

export default async function handler(req:IncomingMessage,res:ServerResponse) {
  const app=await getApp();
  return app.getHttpAdapter().getInstance()(req,res);
}

if(!process.env.VERCEL) {
  getApp().then(app=>app.listen(Number(process.env.PORT??4000)));
}
