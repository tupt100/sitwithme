/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MAILINGTABLE_ARN
  API_SITWITHME_MAILINGTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { DateConst } from '@swm-core/constants/date.const';
import { Mailing, MailingStatus, ResponseMailingNotificationType } from '@swm-core/interfaces/mailing.interface';
import { MailingService } from '@swm-core/services/mailing.service';

const mailingService = new MailingService();

export const handler = async (event) => {
  console.log('event: ', JSON.stringify(event, null, 2));
  let errorMsg;
  try {
    const message = JSON.parse(event.Records[0].Sns.Message);
    const messageId: string = message.mail.messageId;
    let emailAddresses: string[];

    switch (message.notificationType) {
      case 'Bounce':
        emailAddresses = message.bounce.bouncedRecipients.map(function (recipient) {
          return recipient.emailAddress;
        });

        const bounceType = message.bounce.bounceType;
        console.log('Message ' + messageId + ' bounced when sending to ' + emailAddresses.join(', ') + '. Bounce type: ' + bounceType);
        for (const email of emailAddresses) {
          const mailing: Mailing = {
            notificationType: ResponseMailingNotificationType[message.notificationType],
            email,
            timestamp: message.mail.timestamp,
            status: MailingStatus.DISABLE,
            expiredAt: Math.floor((new Date().getTime() + DateConst.DateInUnix * 30) / 1000), // Add auto expire after 30 days
          };
          await mailingService.create(mailing);
        }
        break;
      case 'Complaint':
        emailAddresses = message.complaint.complainedRecipients.map(function (recipient) {
          return recipient.emailAddress;
        });

        console.log('A complaint was reported by ' + emailAddresses.join(', ') + ' for message ' + messageId + '.');
        for (const email of emailAddresses) {
          const mailing: Mailing = {
            notificationType: ResponseMailingNotificationType[message.notificationType],
            email,
            timestamp: message.mail.timestamp,
            status: MailingStatus.DISABLE,
            expiredAt: Math.floor((new Date().getTime() + DateConst.DateInUnix * 30) / 1000), // Add auto expire after 30 days
          };
          await mailingService.create(mailing);
        }
        break;
      case 'Delivery':
        const deliveryTimestamp = message.delivery.timestamp;
        emailAddresses = message.delivery.recipients;

        console.log('Message ' + messageId + ' was delivered successfully at ' + deliveryTimestamp + '.');
        for (const email of emailAddresses) {
          const mailing: Mailing = {
            notificationType: ResponseMailingNotificationType[message.notificationType],
            email,
            timestamp: message.mail.timestamp,
            status: MailingStatus.ENABLE,
            expiredAt: Math.floor((new Date().getTime() + DateConst.DateInUnix * 30) / 1000), // Add auto expire after 30 days
          };
          await mailingService.create(mailing);
        }
        break;
      default:
        throw('Unknown notification type: ' + message.notificationType);
    }
  } catch (e) {
    console.log('ERROR: ', e);
    errorMsg = e.errorMsg || 'Unknown Error';
  }

  if (errorMsg) {
    throw new Error(errorMsg);
  }
};
