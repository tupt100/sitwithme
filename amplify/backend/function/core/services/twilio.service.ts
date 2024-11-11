import { Twilio } from "twilio";

const DEFAULT_VALIDITY_PERIOD = 3 * 60; // 3 mins

export class TwilioService {
  twilio: Twilio;
  messagingServiceSid: string;

  constructor(apiKey: string, apiSecret: string, accountSid: string, messagingServiceSid: string) {
    if (process.env.IS_MOCK) return;

    this.twilio = new Twilio(apiKey, apiSecret, { accountSid, lazyLoading: true });
    this.messagingServiceSid = messagingServiceSid;
  }

  sendSMS(toPhoneNumber: string, body: string, validityPeriod?: number) {
    if (process.env.IS_MOCK) return;

    return this.twilio.messages.create({
      to: toPhoneNumber,
      body,
      messagingServiceSid: this.messagingServiceSid,
      validityPeriod: (validityPeriod ? validityPeriod : DEFAULT_VALIDITY_PERIOD)
    });
  }

}