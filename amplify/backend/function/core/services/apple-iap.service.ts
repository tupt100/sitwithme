import { ResponseReceiptValidation } from '@swm-core/interfaces/apple-iap.interface';
import axios from 'axios';

const END_POINT = 'https://buy.itunes.apple.com';
const SANDBOX_END_POINT = 'https://sandbox.itunes.apple.com';

export class AppleIAPService {
  client: any;

  constructor() {
    this.client = axios.create({
      baseURL: END_POINT
    });
  }

  async validateReceiptByApple(receipt: string, iapSharedSecret: string, excludeOldTransactions: boolean = false): Promise<ResponseReceiptValidation> {
    const params = {
      'receipt-data': receipt,
      password: iapSharedSecret,
      'exclude-old-transactions': excludeOldTransactions,
    };

    let receiptValidationRes = (await this.client.post('/verifyReceipt', params)).data;
    // Status 21007 indicate: This receipt is from the test environment, but it was sent to the production environment for verification.
    // We need verifying receipt in sandbox instead
    if (receiptValidationRes.status === 21007) {
      receiptValidationRes = (await this.client.post(`${SANDBOX_END_POINT}/verifyReceipt`, params)).data;
    }
    console.log('receiptValidationRes: ', receiptValidationRes);
    return receiptValidationRes;
  }
}