import SNS from 'aws-sdk/clients/sns';

// SNS wrapper
// Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SNS.html
export class SNSService {
  sns: SNS;

  constructor() {
    this.sns = new SNS({ apiVersion: "2010-03-31" });
  }

  /**
   * publish message
   * @param {object} params https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SNS.html#publish-property
   * @returns Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SNS.html#publish-property
   */
   publish(params: SNS.PublishInput): Promise<SNS.PublishResponse> {
    return this.sns.publish(params).promise();
  }

}