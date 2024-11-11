import { ErrorCodeConst } from '@swm-core/constants/error-code.const';

export class PlatformException extends Error {
  errCode: string;
  errors: { [key: string]: string[] };
  constructor(message: string, errCode: string = ErrorCodeConst.System, errors?: { [key: string]: string[] }) {
    super(message);
    this.errCode = errCode;
    this.errors = errors;

    // FIXME: Temporary fix for issue: Instanceof Not Working For Custom Errors in TypeScript
    Object.setPrototypeOf(this, PlatformException.prototype);
  }
}
