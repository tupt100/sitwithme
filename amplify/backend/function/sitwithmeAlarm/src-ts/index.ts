/* Amplify Params - DO NOT EDIT
	API_SITWITHME_GRAPHQLAPIIDOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { SNSService } from "@swm-core/services/sns-service";

const {
	ALARM_TOPIC_ARN
} = process.env;

const snsService = new SNSService();

exports.handler = async (event) => {
  // publish message to SNS, then SNS filter message base on `type` and push to SQS
  await snsService.publish({
    Message: JSON.stringify(event),
    MessageAttributes: {
      type: {
        DataType: "String",
        StringValue: event.type,
      },
    },
    TopicArn: ALARM_TOPIC_ARN,
  });
};
