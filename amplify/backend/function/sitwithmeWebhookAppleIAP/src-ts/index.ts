/* Amplify Params - DO NOT EDIT
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { AppleIAPMessageGroup, SubscriptionData } from '@swm-core/interfaces/apple-iap.interface';
import { SQSService } from '@swm-core/services/sqs-service';
import { SSMService } from '@swm-core/services/ssm.service';
import { v4 as uuidv4 } from 'uuid';

const ssmService = new SSMService();
const sqsService = new SQSService();

const {
  IAP_SHARED_SECRET,
  WEBHOOK_IAP_SUBSCRIPTION_QUEUE_URL
} = process.env;

let iapSharedSecret: string;
const loadAppleIAPKey = async () => {
  // User SSM Parameter to get key
  // throw error if secret not found
  // use local variables to caching secret key during lambda lifetime
  if (!iapSharedSecret) {
    const secretKey = await ssmService.getParameter({
      Name: IAP_SHARED_SECRET,
      WithDecryption: true,
    });
    iapSharedSecret = secretKey.Parameter.Value;
  }
  return iapSharedSecret;
};

exports.handler = async (event) => {
  console.info('Event: ', event);
  let statusCode: number;
  try {
    const iapSharedSecret = await loadAppleIAPKey();
    const subscriptionData: SubscriptionData = JSON.parse(event.body);
    if (subscriptionData.password !== iapSharedSecret) {
      statusCode = 400;
    } else {

      await sqsService.sendMessage({
				MessageBody: event.body,
				QueueUrl: WEBHOOK_IAP_SUBSCRIPTION_QUEUE_URL,
        MessageDeduplicationId: uuidv4(),
        MessageGroupId: AppleIAPMessageGroup.WEBHOOK_IAP_SUBSCRIPTION
			});

      statusCode = 200;
    }
  } catch (e) {
    console.log('[Webhook Apple IAP] Error: ', e);
    statusCode = 500;
  }
  return { statusCode };
};
