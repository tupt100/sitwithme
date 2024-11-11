import SSM from 'aws-sdk/clients/ssm';

// SSM Wrapper. Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SSM.html
export class SSMService {
  ssm: SSM;

  constructor() {
    const opts = { apiVersion: "2014-11-06" };
    this.ssm = new SSM(opts);
  }

  getParameter(params: SSM.GetParameterRequest) {
    return this.ssm.getParameter(params).promise();
  }
}
