import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap(): Promise<void> {
  const defaultSecrets =
    config.adminPassword === 'change-me-aspr' ||
    ['dev-only-secret-change-me', 'replace-with-a-long-random-string'].includes(config.adminTokenSecret);
  if (process.env.NODE_ENV === 'production' && defaultSecrets) {
    Logger.error('Refusing to start: set ADMIN_PASSWORD and ADMIN_TOKEN_SECRET in backend/.env.', 'Bootstrap');
    process.exit(1);
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  if (config.trustProxy) app.set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.corsOrigin, credentials: false, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] });
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.enableShutdownHooks();
  await app.listen(config.port);
  Logger.log(`ASPR API listening on http://localhost:${config.port}/api`, 'Bootstrap');
  if (config.adminPassword === 'change-me-aspr') Logger.warn('ADMIN_PASSWORD is the default — set it in backend/.env before going live.', 'Bootstrap');
}
bootstrap();
