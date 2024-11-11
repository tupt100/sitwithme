export enum ProfileSubscriptionStatus {
  ACTIVATED = 'ACTIVATED',
  INACTIVATED = 'INACTIVATED',
}

export interface ProfileSubscription {
  id: string;
  profileID: string;
  appleProductID: string;
  status: ProfileSubscriptionStatus;
  activatedAt: string;
  expiredAt?: string;
  stepFuncExecArn?: string; // for delay tasks verify expiredAt with User Premium
  stepFuncExecStartDate?: string;
}

export interface ProfileSubscriptionUpdateInput {
  stepFuncExecArn?: string;
  stepFuncExecStartDate?: string;
  status?: ProfileSubscriptionStatus;
}

export enum ProfileSubscriptionAlarmType {
  IAP_EXPIRED = 'iap.expired'
}

export interface CreateProfileSubscriptionTransactionInput {
  id: string;
  profileID: string;
  appleProductID: string;
  status: ProfileSubscriptionStatus;
  activatedAt: string;
  expiredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileSubscriptionTransactionInput {
  status: ProfileSubscriptionStatus;
  expiredAt?: string;
}