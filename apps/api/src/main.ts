import './bootstrap-db';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');

  const resourcePath =
    typeof (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ===
    'string'
      ? (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath!
      : '';

  const webDistCandidates = [
    process.env.ERP_WEB_DIST,
    join(__dirname, '../../../web/dist'),
    join(resourcePath, 'web'),
  ].filter(Boolean) as string[];

  for (const webDist of webDistCandidates) {
    if (existsSync(join(webDist, 'index.html'))) {
      app.useStaticAssets(webDist);
      app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
        if (req.path.includes('.')) return next();
        return res.sendFile(join(webDist, 'index.html'));
      });
      console.log(`[web] Serving UI from ${webDist}`);
      break;
    }
  }

  const port = Number(process.env.API_PORT || 3001);
  await app.listen(port, '127.0.0.1');
  console.log(`ERP API running at http://127.0.0.1:${port}/api`);
}

bootstrap();
