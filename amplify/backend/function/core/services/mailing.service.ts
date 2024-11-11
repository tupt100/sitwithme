import { EmailContent, Mailing, MailingNotificationType } from '@swm-core/interfaces/mailing.interface';
import { DynamoDBService } from './dynamodb.service';
import { PinpointService } from './pinpoint.service';

const {
  API_SITWITHME_MAILINGTABLE_NAME,
  PINPOINT_APP_ID,
} = process.env;
const dynamoDBService = new DynamoDBService();
const pinpointService = new PinpointService(PINPOINT_APP_ID);

export class MailingService {
  /**
   * Allow sending email if email notification type is DELIVERY or not existed
   */
  async sendEmail(emailAddress: string, emailContent: EmailContent) {
    const mailing = await this.get(emailAddress);
    if (!mailing || mailing.notificationType === MailingNotificationType.DELIVERY) {
      await pinpointService.sendEmail(emailAddress, emailContent.subject, emailContent.bodyHTML, emailContent.bodyText);
    }
  }

  async create(mailing: Mailing) {
    const params = {
      TableName: API_SITWITHME_MAILINGTABLE_NAME,
      Item: mailing
    };
    await dynamoDBService.put(params);
  }

  async get(email: string): Promise<Mailing> {
    return <Mailing>(await dynamoDBService.get({
      TableName: API_SITWITHME_MAILINGTABLE_NAME,
      Key: { email },
    })).Item;
  }
}
