import { VGSErrorCode } from './VGSErrorCodes';

/** Class representing an error in the VGS Collect SDK. */
export class VGSError extends Error {
  code: VGSErrorCode;
  details?: any;

  constructor(code: VGSErrorCode, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
