import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { PlatformException } from './platform.exception';

export class CustomException extends Error {
  errCode: string;
  errors: { message: string, messageCode: string };
  constructor(messageCode: string, message?: string) {
    super();
    this.errCode = ErrorCodeConst.Custom;
    this.errors = {
      message,
      messageCode,
    };

    // FIXME: Temporary fix for issue: Instanceof Not Working For Custom Errors in TypeScript
    Object.setPrototypeOf(this, PlatformException.prototype);
  }
}
