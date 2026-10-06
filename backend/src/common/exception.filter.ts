import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Last line of error handling. Expected errors (HttpException) keep their status and message;
 * anything else is logged in full on the server and answered with a generic 500, so stack
 * traces, SQL and file paths never reach a client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    if (res.headersSent) return;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json(typeof body === 'object' ? body : { statusCode: status, message: body });
      return;
    }
    // Body-parser errors (malformed JSON, payload too large) carry a client-error status.
    const e = exception as { status?: number; expose?: boolean; type?: string; stack?: string; message?: string };
    if (e?.expose && e.status && e.status >= 400 && e.status < 500) {
      res.status(e.status).json({ statusCode: e.status, message: e.type === 'entity.too.large' ? 'That request is too large.' : 'The request could not be read.' });
      return;
    }
    this.logger.error(`${req.method} ${req.originalUrl}: ${e?.message}`, e?.stack);
    res.status(500).json({ statusCode: 500, message: 'Something went wrong. Please try again.' });
  }
}
