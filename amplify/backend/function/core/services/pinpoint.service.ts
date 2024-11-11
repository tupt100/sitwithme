import Pinpoint from 'aws-sdk/clients/pinpoint';

export enum NotificationAction {
  URL = 'URL',
  OPEN_APP = 'OPEN_APP',
  DEEP_LINK = 'DEEP_LINK',
}

export enum NotificationPriority {
  NORMAL = 'normal',
  HIGH = 'high'
}

export class PinpointService {
  pinpoint: Pinpoint;
  applicationId: string;
  service: string;

  constructor(applicationId: string) {
    this.pinpoint = new Pinpoint({ apiVersion: '2016-12-01', region: 'us-east-1' });
    this.applicationId = applicationId;

    // In reality, we use FCM for pushing notifications but Pinpoint keep GCM as the service name
    // to avoid crash other legacy application
    this.service = 'GCM';
  }

  createMessageRequest(token: string, title: string, message: string, data: any, badge: number = 1, sound = 'default') {
    const content = {
      notification: {
        title,
        body: message,
        badge,
        sound
      }
    };
    if (data) {
      content['data'] = data;
    }

    const messageRequest = {
      Addresses: {
        [token]: {
          ChannelType: this.service
        }
      },
      MessageConfiguration: {
        GCMMessage: {
          RawContent: JSON.stringify(content)
        }
      }
    };

    // if (action === NotificationAction.URL) {
    //   if (!url) {
    //     throw new PlatformException("URL is required");
    //   }
    //   messageRequest['MessageConfiguration']['GCMMessage']['Url'] = url;
    // }

    return messageRequest;
  }

  async sendMessages(token: string, title: string, message: string, data: any, badge: number = 1, sound = 'default') {
    const messageRequest = this.createMessageRequest(token, title, message, data, badge, sound);
    const params: Pinpoint.SendMessagesRequest = {
      ApplicationId: this.applicationId,
      MessageRequest: messageRequest
    };

    return this.pinpoint.sendMessages(params).promise();
  }

  async sendEmail(toAddress: string, subject: string, bodyHTML: string, bodyText: string = '', fromAddress?: string) {
    const charset = 'UTF-8';
    const params = {
      ApplicationId: this.applicationId,
      MessageRequest: {
        Addresses: {
          [toAddress]: {
            ChannelType: 'EMAIL'
          }
        },
        MessageConfiguration: {
          EmailMessage: {
            SimpleEmail: {
              Subject: {
                Charset: charset,
                Data: subject
              },
              HtmlPart: {
                Charset: charset,
                Data: bodyHTML
              },
              TextPart: {
                Charset: charset,
                Data: bodyText
              }
            }
          }
        }
      }
    };

    if (fromAddress) {
      params.MessageRequest.MessageConfiguration.EmailMessage['FromAddress'] = fromAddress;
    }

    return this.pinpoint.sendMessages(params).promise();
  }
}
