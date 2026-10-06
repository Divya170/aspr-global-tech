import { ArgumentsHost, Catch, ExceptionFilter, HttpException, PayloadTooLargeException } from '@nestjs/common';
import type { Response } from 'express';
import { config } from '../config';

/** Turns Multer limit errors into the same field-error shape the forms render. */
@Catch(PayloadTooLargeException, HttpException)
export class UploadErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse() as any;
    const msg = typeof body === 'string' ? body : body?.message;
    if (status === 413 || /too large|too many files|unexpected field/i.test(String(msg))) {
      const text = /too many|unexpected/i.test(String(msg)) ? `Attach up to ${config.maxFiles} files.` : `Each file must be ${Math.round(config.maxFileBytes / 1048576)} MB or smaller.`;
      res.status(400).json({ statusCode: 400, message: text, errors: { files: text } });
      return;
    }
    res.status(status).json(typeof body === 'object' ? body : { statusCode: status, message: body });
  }
}
