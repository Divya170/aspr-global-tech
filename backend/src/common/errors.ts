import { BadRequestException } from '@nestjs/common';
import type { Errors } from './rules';

/** 400 with a field → message map the site renders inline next to each field. */
export class ValidationFailed extends BadRequestException {
  constructor(errors: Errors, message = 'Please check the highlighted fields.') {
    super({ statusCode: 400, message, errors });
  }
}

export function assertValid(errors: Errors, message?: string): void {
  if (Object.keys(errors).length) throw new ValidationFailed(errors, message);
}

/** Throws a 400 with field errors. Typed `never` so TypeScript narrows after `if (...) fail(...)`. */
export function fail(errors: Errors, message?: string): never {
  throw new ValidationFailed(errors, message);
}
