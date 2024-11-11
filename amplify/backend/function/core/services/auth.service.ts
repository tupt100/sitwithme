import * as https from 'https';
import { promisify } from 'util';
import { randomDigits } from 'crypto-secure-random-digit';
import { v4 as uuidv4 } from 'uuid';
import jsonwebtoken from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import parsePhoneNumber from 'libphonenumber-js/mobile';
import { CognitoService } from './cognito.service';
import { DynamoDBService } from './dynamodb.service';
import { CreateUserConfirmationInput, UserConfirmation, UserConfirmationEvent } from '@swm-core/interfaces/user.interface';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { AuthConst } from '@swm-core/constants/auth.const';
import { TwilioService } from './twilio.service';
import { SSMService } from './ssm.service';
import { body as codeVerificationBody } from '@swm-core/sms-templates/code-verification.tpl';
import { buildCodeVerificationEmail } from '@swm-core/email-templates/code-verification.tpl';
import { MailingService } from './mailing.service';

const {
  ENV,
  MAGIC_PHONE_NUMBERS,
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_MESSAGING_SERVICE_SID_NAME,
  API_SITWITHME_USERCONFIRMATIONTABLE_NAME
} = process.env;

const cognitoService = new CognitoService();
const dynamoDBService = new DynamoDBService();
const ssmService = new SSMService();
let twilioService: TwilioService;
const mailingService = new MailingService();

const loadTwilioInstance = async (apiKeyName: string, apiSecretName: string, accountSIDName: string, messagingServiceSidName: string) => {
  // User SSM Parameter to get key
  // throw error if secret not found
  // use local variables to caching secret key during lambda lifetime
  if (!twilioService) {
    const keys = [apiKeyName, apiSecretName, accountSIDName, messagingServiceSidName];
    const tasks: Promise<any>[] = keys.map((key) => ssmService.getParameter({ Name: key, WithDecryption: true }));

    const result = (await Promise.all(tasks)).map((k) => k.Parameter.Value);
    twilioService = new TwilioService(result[0], result[1], result[2], result[3]);
  }
  return twilioService;
};

let cacheKeys;
const verifyPromised = promisify(jsonwebtoken.verify.bind(jsonwebtoken));

export class AuthService {
  async verifyIdToken(idToken: string, userPoolID: string, region: string): Promise<string> {
    try {
      const cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolID}`;
      const tokenSections = idToken.split('.');
      if (tokenSections.length < 2) {
        throw new Error('Token is invalid');
      }

      const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf-8');
      const header = JSON.parse(headerJSON);
      const keys = await this.getPublicKeys(userPoolID, region);
      const key = keys[header.kid];
      if (!key) {
        throw new Error('claim made for unknown id');
      }

      const claim = await verifyPromised(idToken, key.pem);
      const currentSeconds = Math.floor( (new Date()).valueOf() / 1000);
      if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
        throw new Error('claim is expired or invalid');
      }

      if (claim.iss !== cognitoIssuer) {
        throw new Error('claim issuer is invalid');
      }

      if (claim.token_use !== 'id') {
        throw new Error('claim use is not access');
      }

      if (!claim['custom:id']) {
        throw new Error('custom id missing');
      }

      return claim['custom:id'];
    } catch (e) {
      console.log("ERROR: verifyIdToken ", e);
      throw e;
    }
  }

  async getPublicKeys(userPoolID: string, region: string) {
    const cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolID}`;
    return new Promise((resolve, reject) => {
      if (!cacheKeys) {
        const url = `${cognitoIssuer}/.well-known/jwks.json`;
        https.get(url, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            console.log('@ data:', JSON.parse(data));
            cacheKeys = JSON.parse(data).keys.reduce((agg, current) => {
              const pem = jwkToPem(current);
              agg[current.kid] = { instance: current, pem };
              return agg;
            }, {});
            resolve(cacheKeys);
          });

        });
      } else {
        resolve(cacheKeys);
      }
    });
  }

  async getUserConfirmation(cognitoUsername: string, event: UserConfirmationEvent): Promise<UserConfirmation> {
    return <UserConfirmation>(await dynamoDBService.get({
      TableName: process.env.API_SITWITHME_USERCONFIRMATIONTABLE_NAME,
      Key: { cognitoUsername, event },
    })).Item;
  }

  async deleteUserConfirmation(cognitoUsername: string, event: UserConfirmationEvent) {
    const params = {
      TableName: API_SITWITHME_USERCONFIRMATIONTABLE_NAME,
      Key: { cognitoUsername, event }
    };
    await dynamoDBService.delete(params);
  }

  async saveUserConfirmation(input: CreateUserConfirmationInput): Promise<UserConfirmation> {
    const now = new Date().toISOString();
    const userConfirmation: UserConfirmation = {
      ...input,
      __typename: 'UserConfirmation',
      retryAttempts: 0,
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_USERCONFIRMATIONTABLE_NAME,
      Item: userConfirmation
    };
    await dynamoDBService.put(params);
    return userConfirmation;
  }

  /**
   * Verify User cognitoUsername and code, then confirm User on Cognito
   *
   * 1. Look up DynamoDB to compare cognitoUsername + code
   * 2. If retry attempts is over 3 times, then reject
   * 3. If everything is OK, confirm User on Cognito, remove delete this record in DB
   *
   * @param cognitoUsername Cognito Username
   * @param code Code verification
   * @param userPoolID Cognito User Pool ID
   */
  async confirmUser(cognitoUsername: string, code: string, userPoolID: string): Promise<boolean> {
    // 1. Look up DynamoDB to compare cognitoUsername + code
    const userConfirmation = await this.getUserConfirmation(cognitoUsername, UserConfirmationEvent.SIGN_UP);
    if (!userConfirmation) {
      throw new BadRequestException('Code not found. Please help call resend code to your phone number!');
    }

    // 2. If retry attempts is over 3 times, then reject
    if (userConfirmation.retryAttempts >= AuthConst.maxRetryAttempts) {
      throw new BadRequestException(`You retried ${AuthConst.maxRetryAttempts} times failed. Please help call resend code to your phone number to receive the new code!`);
    }

    // 3. If everything is OK, confirm User on Cognito, remove this record in DB
    if (userConfirmation.code === code) {
      await cognitoService.confirmSignUp({
        UserPoolId: userPoolID,
        Username: cognitoUsername
      });
      await this.deleteUserConfirmation(userConfirmation.cognitoUsername, userConfirmation.event);
    } else {
      throw new BadRequestException('The verification code is invalid');
    }

    return true;
  }

  /**
   *  Send code verification to phone number
   *
   * @param cognitoUsername Cognito Username
   * @param phoneNumber phone number
   */
  async sendSignUpCodeVerificationToPhone(cognitoUsername: string, phoneNumber: string): Promise<boolean> {
    let code: string;
    const rawPhone = parsePhoneNumber(phoneNumber, 'US');
    if (!rawPhone?.isPossible()) {
      throw new BadRequestException('This phone number is invalid.');
    }

    if (ENV === 'prod' || ENV === 'stag' || (MAGIC_PHONE_NUMBERS && MAGIC_PHONE_NUMBERS.includes(rawPhone.number as string))) {
      // send SMS
      code = randomDigits(AuthConst.signUpCodeLength).join('');

      const twilioService = await loadTwilioInstance(TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_ACCOUNT_SID, TWILIO_MESSAGING_SERVICE_SID_NAME);
      await twilioService.sendSMS(rawPhone.number as string, codeVerificationBody(code));

    } else {
      code = AuthConst.signUpCode[ENV] || '111111';
    }

    // save to DB
    await this.saveUserConfirmation({ cognitoUsername, event: UserConfirmationEvent.SIGN_UP, code });

    return true
  }

  /**
   *  Send code verification to email
   *
   * @param cognitoUsername Cognito Username
   * @param email Email
   */
   async sendSignUpCodeVerificationToEmail(cognitoUsername: string, email: string): Promise<boolean> {
    const code = randomDigits(AuthConst.signUpCodeLength).join('');

    // send Email
    const emailContent = buildCodeVerificationEmail(code);
    await mailingService.sendEmail(email, emailContent);

    // save to DB
    await this.saveUserConfirmation({ cognitoUsername, event: UserConfirmationEvent.SIGN_UP, code });

    return true
  }
}