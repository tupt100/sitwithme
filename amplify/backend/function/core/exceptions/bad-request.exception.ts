import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { PlatformException } from './platform.exception';

export class BadRequestException extends PlatformException {
  constructor(message: string, errCode: string = ErrorCodeConst.BadRequest, errors?: { [key: string]: string[] }) {
    super(message, errCode, errors);
  }
}
