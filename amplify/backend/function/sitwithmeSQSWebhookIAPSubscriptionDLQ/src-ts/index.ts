/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MAILINGTABLE_ARN
  API_SITWITHME_MAILINGTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { buildUnexpectedError } from "@swm-core/email-templates/unexpected-error.tpl";
import { SubscriptionData } from "@swm-core/interfaces/apple-iap.interface";
import { Role } from "@swm-core/interfaces/user.interface";
import { MailingService } from '@swm-core/services/mailing.service';
import { SQSService } from "@swm-core/services/sqs-service";
import { UserService } from "@swm-core/services/user.service";

const {
  WEBHOOK_IAP_SUBSCRIPTION_DLQ_URL,
} = process.env;

const sqsService = new SQSService();
const userService = new UserService();
const mailingService = new MailingService();

const recordHandler = async (record) => {
  console.log("Record: ", JSON.stringify(record, null, 2));
  const data: SubscriptionData = JSON.parse(record.body);

  // send email to admin, ignore handle error
  const admins = await userService.listUsersByRole(Role.ADMIN);
  try {
    const emailContent = buildUnexpectedError(data, new Date(), 'WEBHOOK_IAP_SUBSCRIPTION');
    await Promise.all(admins.map(async (user) => {
      return await mailingService.sendEmail(user.email, emailContent);
    }));
  } catch (e) {
    console.log('[WEBHOOK_IAP_SUBSCRIPTION] ERROR when sending email: ', e);
  }

  // ack sqs message
  await sqsService.deleteMessage({
    QueueUrl: WEBHOOK_IAP_SUBSCRIPTION_DLQ_URL,
    ReceiptHandle: record.receiptHandle
  });
};

export const handler = async (event) => {
  console.log("event: ", JSON.stringify(event, null, 2));
  let errorMsg;

  for (const record of event.Records) {
    try {
      await recordHandler(record);
    } catch (e) {
      console.log("ERROR: ", e);
      errorMsg = e.errorMsg || "Unknown Error";
    }
  }

  if (errorMsg) {
    throw new Error(errorMsg);
  }
};
