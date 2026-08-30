import "reflect-metadata";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api", { exclude: [{ path:"", method:RequestMethod.GET }] });
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"], credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? 4000));
}
bootstrap();
