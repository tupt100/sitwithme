export interface EmailContent {
  subject: string;
  bodyHTML: string;
  bodyText: string;
}

export interface Mailing {
  email: string;
  notificationType: MailingNotificationType;
  timestamp: string;
  status: MailingStatus;
  expiredAt: number;
}

export enum MailingNotificationType {
  COMPLAINT = 'COMPLAINT',
  BOUNCE = 'BOUNCE',
  DELIVERY = 'DELIVERY',
}

export enum MailingStatus {
  DISABLE = 'DISABLE',
  ENABLE = 'ENABLE',
}

export enum ResponseMailingNotificationType {
  Bounce = 'BOUNCE',
  Complaint = 'COMPLAINT',
  Delivery = 'DELIVERY'
}