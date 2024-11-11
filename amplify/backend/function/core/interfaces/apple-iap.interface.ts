export interface ResponseReceiptValidation {
  environment: string;
  receipt: Receipt;
  latest_receipt_info: LatestReceiptInfo[];
  status: number;
}

export interface SubscriptionData {
  auto_renew_product_id: string;
  environment: string;
  notification_type: AppleIAPNotificationType;
  original_transaction_id?: string;
  password: string;
  unified_receipt: UnifiedReceipt;
  expiration_intent: number;
}

export interface UnifiedReceipt {
  environment: string;
  latest_receipt: string;
  latest_receipt_info: LatestReceiptInfo[];
  pending_renewal_info: PendingRenewInfo[];
}

export interface InAppReceipt {
  original_transaction_id: string;
  transaction_id: string;
  product_id: string;
  expires_date_ms: number;
  purchase_date_ms: number;
}

export interface Receipt {
  in_app: InAppReceipt[];
}

export interface LatestReceiptInfo {
  original_transaction_id: string;
  transaction_id: string;
  purchase_date: string;
  expires_date_ms: number;
  cancellation_date_ms: number;
  cancellation_reason: number;
  product_id: string;
  purchase_date_ms: number;
}

export interface PendingRenewInfo {
  auto_renew_product_id: string;
  original_transaction_id: string;
  product_id: string;
  expiration_intent: string;
}

export enum AppleIAPNotificationType {
  CANCEL = 'CANCEL',
  DID_FAIL_TO_RENEW = 'DID_FAIL_TO_RENEW',
  DID_RECOVER = 'DID_RECOVER',
  DID_RENEW = 'DID_RENEW',
  INTERACTIVE_RENEWAL = 'INTERACTIVE_RENEWAL',
  DID_CHANGE_RENEWAL_STATUS = 'DID_CHANGE_RENEWAL_STATUS',
  DID_CHANGE_RENEWAL_PREF = 'DID_CHANGE_RENEWAL_PREF',
}

export enum AppleIAPMessageGroup {
  WEBHOOK_IAP_SUBSCRIPTION = 'WEBHOOK_IAP_SUBSCRIPTION',
}
