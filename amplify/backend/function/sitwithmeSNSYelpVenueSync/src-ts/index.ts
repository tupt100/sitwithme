/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { YelpBusiness } from "@swm-core/interfaces/workplace.interface";
import { WorkplaceService } from "@swm-core/services/workplace.service";

// const mockEvent = {
//   "Records": [
//     {
//       "EventVersion": "1.0",
//       "EventSubscriptionArn": "EXAMPLE",
//       "EventSource": "aws:sns",
//       "Sns": {
//         "SignatureVersion": "1",
//         "Timestamp": "2020-07-02T07:39:32.564Z",
//         "Signature": "EXAMPLE",
//         "SigningCertUrl": "EXAMPLE",
//         "MessageId": "4fea4c01-2d40-402d-beea-a7757df5430b",
//         "Message": "{\"email\":\"abc@gmail.com\"}",
//         "MessageAttributes": {},
//         "Type": "Notification",
//         "UnsubscribeUrl": "EXAMPLE",
//         "TopicArn": "arn:aws:sns:us-east-1:123456789012:WelcomeNewUser",
//         "Subject": ""
//       }
//     }
//   ]
// };

const workplaceService = new WorkplaceService();

const recordHandler = async (record: any) => {
  const message = record?.Sns?.Message;
  if (!message) return;

  const business = JSON.parse(message) as YelpBusiness;

  // sync to our DB
  await workplaceService.syncWorkplacesFromYelpBusiness(business);
};

exports.handler = async (event) => {
  console.log('Event :>> ', JSON.stringify(event, null, 2));
  await Promise.all(event.Records.map(recordHandler));
};
