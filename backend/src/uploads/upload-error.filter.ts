import { ArgumentsHost, Catch, ExceptionFilter, HttpException, PayloadTooLargeException } from '@nestjs/common';
import type { Request, Response } from 'express';
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
      const media = host.switchToHttp().getRequest<Request>().originalUrl.startsWith('/api/admin/media');
      const text = /too many|unexpected/i.test(String(msg))
        ? (media ? 'Upload one file at a time.' : `Attach up to ${config.maxFiles} files.`)
        : media ? `Videos must be ${config.maxVideoBytes / 1048576} MB or smaller (images ${config.maxImageBytes / 1048576} MB).`
          : `Each file must be ${Math.round(config.maxFileBytes / 1048576)} MB or smaller.`;
      res.status(400).json({ statusCode: 400, message: text, errors: { [media ? 'file' : 'files']: text } });
      return;
    }
    res.status(status).json(typeof body === 'object' ? body : { statusCode: status, message: body });
  }
}
