export interface Transaction {
  id: string;
  profileID: string;
  originalTransactionId?: string;
  originalTransactionID?: string;
  appleTransactionID?: string;
  profileSubscriptionID?: string;
  failedReason?: string;
  cancellationReason?: string;
  state: TransactionState;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionHistory {
  id: string;
  transactionID: string;
  failedReason?: string;
  state: TransactionHistoryState;
  createdAt: string;
}

export enum TransactionState {
  PENDING = 'PENDING',
  SUCCEED = 'SUCCEED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

export enum TransactionHistoryState {
  PENDING = 'PENDING',
  SUCCEED = 'SUCCEED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

export interface CreateReceiptInput {
  receipt: string;
  profileID: string;
}

export interface CreateTransactionInput {
  id: string;
  profileID: string;
  originalTransactionID?: string;
  appleTransactionID?: string;
  profileSubscriptionID?: string;
  failedReason?: string;
  cancellationReason?: string;
  state: TransactionState;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTransactionInput {
  originalTransactionID?: string;
  appleTransactionID?: string;
  profileSubscriptionID?: string;
  failedReason?: string;
  cancellationReason?: string;
  state: TransactionState;
}

export interface CreateTransactionHistoryInput {
  id: string;
  transactionID: string;
  state: TransactionHistoryState;
  failedReason?: string;
  createdAt: string;
  updatedAt: string;
}
