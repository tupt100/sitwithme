import SQS from 'aws-sdk/clients/sqs';

// SQS wrapper
// Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html
export class SQSService {
  sqs: SQS;

  constructor() {
    this.sqs = new SQS({ apiVersion: "2012-11-05" });
  }

  /**
   * delete message
   * @param {object} params https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#deleteMessage-property
   * @returns Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#deleteMessage-property
   */
   deleteMessage(params: SQS.DeleteMessageRequest) {
    return this.sqs.deleteMessage(params).promise();
  }

  sendMessage(params: SQS.SendMessageRequest): Promise<SQS.SendMessageResult> {
    return this.sqs.sendMessage(params).promise();
  }
}