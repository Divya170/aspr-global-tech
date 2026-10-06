import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/exception.filter';
import { config } from './config';

/**
 * Starts the API. Runs directly (`node dist/main`) or is called by the root server.js,
 * which handles shutdown signals itself and passes `shutdownHooks: false`.
 */
export async function bootstrap({ shutdownHooks = true } = {}): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: config.isProd ? ['log', 'warn', 'error'] : undefined });
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useBodyParser('json', { limit: '256kb' });
  app.enableCors({ origin: config.corsOrigin, credentials: true, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] });
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    // JSON never needs to run scripts or load anything; media responses set their own policy.
    if (!req.path.startsWith('/api/media/')) res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (req.path.startsWith('/api/admin')) res.setHeader('Cache-Control', 'no-store');
    next();
  });
  if (shutdownHooks) app.enableShutdownHooks();
  if (config.host) await app.listen(config.port, config.host);
  else await app.listen(config.port);
  Logger.log(`ASPR API listening on http://${config.host || 'localhost'}:${config.port}/api`, 'Bootstrap');
  return app;
}

if (require.main === module) {
  bootstrap().catch((e) => {
    Logger.error((e as Error).message, 'Bootstrap');
    process.exit(1);
  });
}
