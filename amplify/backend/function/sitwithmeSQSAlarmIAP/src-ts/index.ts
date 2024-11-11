/* Amplify Params - DO NOT EDIT
	ENV
	REGION
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_ARN
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
Amplify Params - DO NOT EDIT */

import { ProfileSubscriptionStatus } from "@swm-core/interfaces/profile-subscription.interface";
import { MemberShip } from "@swm-core/interfaces/profile.interface";
import { ProfileSubscriptionService } from "@swm-core/services/profile-subscription.service";
import { ProfileService } from "@swm-core/services/profile.service";
import { SQSService } from "@swm-core/services/sqs-service";


const {
  ALARM_IAP_QUEUE_URL
} = process.env;

const sqsService = new SQSService();
const profileService = new ProfileService();
const profileSubscriptionService = new ProfileSubscriptionService();

const recordHandler = async (record) => {
  console.log("Record: ", JSON.stringify(record, null, 2));
  const body = JSON.parse(record.body);

  /**
   * data format:
   * {
   *   "alarmDate": "2021-08-11T11:00:00.000Z",
   *   "profileSubscriptionID": "xxx",
   *   "type": "alert_type"
   * }
   */
  const data = JSON.parse(body.Message);

  // verify profile subscription alarm is valid or not first
  const profileSubscription = await profileSubscriptionService.get(data.profileSubscriptionID);
  if (profileSubscription) {
    if (profileSubscription.status === ProfileSubscriptionStatus.ACTIVATED) {
      if (new Date(data.alarmDate).getTime() === new Date(profileSubscription.expiredAt || null).getTime()) {
        console.log('[Expirehandler]');
        // update to inactivate, user has no member ship longer
        // profile must be updated first because the subscription notification realtime will trigger after profile-subscription update (using profile memberShip to return Client)
        await profileService.update(profileSubscription.profileID, { memberShip: MemberShip.NONE });
        await profileSubscriptionService.update(profileSubscription.id, {
          status: ProfileSubscriptionStatus.INACTIVATED
        });
      }
    }

    // Ack profileSubscription record
    await profileSubscriptionService.update(profileSubscription.id, {
      stepFuncExecArn: null,
      stepFuncExecStartDate: null
    });
    console.log("success");
  }

  // ack sqs message
  await sqsService.deleteMessage({
    QueueUrl: ALARM_IAP_QUEUE_URL,
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
