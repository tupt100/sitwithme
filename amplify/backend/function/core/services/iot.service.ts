import Iot from 'aws-sdk/clients/iot';

export class IotService {
  iot: Iot;

  constructor() {
    this.iot = new Iot({apiVersion: '2015-05-28'});
  }

  attachPolicy(params: Iot.AttachPolicyRequest) {
    return this.iot.attachPolicy(params).promise();
  }

}