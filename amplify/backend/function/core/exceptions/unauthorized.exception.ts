import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { PlatformException } from './platform.exception';

export class UnauthorizedException extends PlatformException {
  constructor(message?: string, errCode: string = ErrorCodeConst.Unauthorized, errors?: { [key: string]: string[] }) {
    super(message, errCode, errors);
    this.message = message || 'Unauthorized';
  }
}
