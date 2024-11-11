import { Transaction, TransactionHistoryState, TransactionState, CreateReceiptInput, CreateTransactionInput, UpdateTransactionInput, CreateTransactionHistoryInput, TransactionHistory } from '@swm-core/interfaces/transaction.interface';
import { DynamoDBService } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { MemberShip } from '@swm-core/interfaces/profile.interface';
import { AppleIAPService } from './apple-iap.service';
import { SSMService } from './ssm.service';
import { AppleIAPFailedReason, CancellationReason, ExpirationReason } from '@swm-core/constants/apple-iap.const';
import { AppleIAPNotificationType, LatestReceiptInfo, ResponseReceiptValidation, SubscriptionData, UnifiedReceipt } from '@swm-core/interfaces/apple-iap.interface';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { ProfileSubscriptionService } from './profile-subscription.service';
import { CreateProfileSubscriptionTransactionInput, ProfileSubscription, ProfileSubscriptionStatus, UpdateProfileSubscriptionTransactionInput } from '@swm-core/interfaces/profile-subscription.interface';
import { S3Service } from './s3.service';
import { TransactionConst } from '@swm-core/constants/transaction.const';
import { CustomException } from '@swm-core/exceptions/custom.exception';
import { CustomErrorCodeConst } from '@swm-core/constants/error-code.const';

const {
  API_SITWITHME_TRANSACTIONTABLE_NAME,
  API_SITWITHME_TRANSACTIONHISTORYTABLE_NAME,
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
  API_SITWITHME_PROFILETABLE_NAME,
  STORAGE_DOCS_BUCKETNAME,
  IAP_SHARED_SECRET
} = process.env;

const dynamoDBService = new DynamoDBService();
const ssmService = new SSMService();
const appleIAPService = new AppleIAPService();
const profileSubscriptionService = new ProfileSubscriptionService();
const s3Service = new S3Service();

let iapSharedSecret: string;
const loadAppleIAPKey = async () => {
  // User SSM Parameter to get key
  // throw error if secret not found
  // use local variables to caching secret key during lambda lifetime
  if (!iapSharedSecret) {
    const secretKey = await ssmService.getParameter({
      Name: IAP_SHARED_SECRET,
      WithDecryption: true,
    });
    iapSharedSecret = secretKey.Parameter.Value;
  }
  return iapSharedSecret;
};

export class TransactionService {
  /**
   * 1. Create pending transaction and history
   * 2. Validate receipt with Apple
   *  - If SUCCEED and existed transaction by appleTransactionID => remove pending transaction and do nothing
   *  - If SUCCEED and not existed transaction by appleTransactionID:
   *    + save succeed transaction and history
   *    + create new profile subscription if plan is not existed
   *  - If FAILED => save failed transaction and history
   */
  async createReceipt(receiptInput: CreateReceiptInput): Promise<boolean> {
    const profileID: string = receiptInput.profileID;
    // 1. Create pending transaction and history
    const now = new Date().toISOString();
    const transactionID = uuidv4();
    const pendingTransactionHistoryID = uuidv4();
    await dynamoDBService.transactionWrite({
      TransactItems: [
        this.buildCreateTransaction({
          id: transactionID,
          profileID,
          state: TransactionState.PENDING,
          createdAt: now,
          updatedAt: now,
        }),
        this.buildCreateTransactionHistory({
          id: pendingTransactionHistoryID,
          transactionID,
          state: TransactionHistoryState.PENDING,
          createdAt: now,
          updatedAt: now,
        }),
      ]
    });
    await this.saveReceiptToS3(transactionID, receiptInput.receipt);

    // 2. Validate receipt with Apple
    const iapSharedSecret = await loadAppleIAPKey();
    const excludeOldTransactions = true;
    const validatedReceipt: ResponseReceiptValidation = await appleIAPService.validateReceiptByApple(receiptInput.receipt, iapSharedSecret, excludeOldTransactions);

    console.log('createReceipt - Validated Receipt: ', validatedReceipt);
    // Check receipt status: https://developer.apple.com/documentation/appstorereceipts/status
    const receiptStatus: number = validatedReceipt.status;
    let failedReason: string = AppleIAPFailedReason[receiptStatus] || 'Unknown Error. Please help contact support.';
    let transactionHistoryState: TransactionHistoryState = TransactionHistoryState.FAILED;
    let transactionState: TransactionState = TransactionState.FAILED;
    let memberShip: MemberShip = MemberShip.NONE;
    let originalTransactionID: string;
    let appleTransactionID: string;
    let isValidateReceiptSucceed: boolean = false;
    let appleProductID: string;
    let profileSubscriptionID: string;
    let activatedAt: string;
    let expiredAt: string;
    let profileSubscriptionTransaction;

    // Validate receipt with Apple: Succeed
    if (receiptStatus === 0) {
      const latestReceiptInfo: LatestReceiptInfo = validatedReceipt.latest_receipt_info?.[0];
      if (!latestReceiptInfo) {
        console.log('createReceipt - latestReceiptInfo not found');
        throw new BadRequestException('Missing latest receipt info');
      }
      appleTransactionID = latestReceiptInfo.transaction_id;
      // - If existed transaction by appleTransactionID => remove pending transaction and do nothing
      const existedTransaction: Transaction = await this.getTransactionByAppleTransactionID(appleTransactionID);
      if (existedTransaction) {
        console.log('Transaction is existed.', existedTransaction);
        await dynamoDBService.transactionWrite({
          TransactItems: [
            this.buildDeleteTransaction(transactionID),
            this.buildDeleteTransactionHistory(pendingTransactionHistoryID),
          ]
        });

        if (existedTransaction.profileID !== profileID) {
          console.log('Profile is not matched receipt info', profileID, existedTransaction);
          throw new CustomException(CustomErrorCodeConst.ProfileDoesNotMatchedReceipt);
        }

        // Return true if expiredAt still available
        return new Date(Number(latestReceiptInfo.expires_date_ms)).getTime() > new Date().getTime();
      }
      // If not existed transaction by appleTransactionID - create new profile subscription if plan is not existed
      failedReason = null;
      transactionHistoryState = TransactionHistoryState.SUCCEED;
      transactionState = TransactionState.SUCCEED;
      originalTransactionID = latestReceiptInfo.original_transaction_id;
      appleProductID = latestReceiptInfo.product_id;
      activatedAt = new Date(Number(latestReceiptInfo.purchase_date_ms)).toISOString();
      expiredAt = new Date(Number(latestReceiptInfo.expires_date_ms)).toISOString();
      isValidateReceiptSucceed = true;
      memberShip = MemberShip.PREMIUM;

      const latestProfileSubscription: ProfileSubscription = await profileSubscriptionService.getProfileSubscriptionByProfileIDAndAppleProductID(profileID, appleProductID);
      console.log('Handle subscription for existed profile subscription', latestProfileSubscription);
      if (latestProfileSubscription) {
        profileSubscriptionID = latestProfileSubscription.id;
        profileSubscriptionTransaction = this.buildUpdateProfileSubscription(profileSubscriptionID, {
          status: ProfileSubscriptionStatus.ACTIVATED,
          expiredAt,
        });
      } else {
        profileSubscriptionID = uuidv4();
        profileSubscriptionTransaction = this.buildCreateProfileSubscription({
          id: profileSubscriptionID,
          profileID,
          appleProductID,
          status: ProfileSubscriptionStatus.ACTIVATED,
          activatedAt,
          expiredAt,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const transactItems: any[] = [
      this.buildUpdateProfileMemberShip(profileID, memberShip),
      this.buildUpdateTransaction(transactionID, {
        originalTransactionID,
        appleTransactionID,
        profileSubscriptionID,
        failedReason,
        state: transactionState,
      }),
      this.buildCreateTransactionHistory({
        id: uuidv4(),
        transactionID,
        state: transactionHistoryState,
        failedReason,
        createdAt: now,
        updatedAt: now,
      }),
    ];

    if (profileSubscriptionTransaction) {
      transactItems.push(profileSubscriptionTransaction);
    }

    // 3. Update transaction and history
    await dynamoDBService.transactionWrite({ TransactItems: transactItems });

    return isValidateReceiptSucceed;
  }

  /**
   * 1. Handled cases:
   * - DID_RENEW
   * - DID_RENEW_FAILED
   * - INTERACTIVE_RENEWAL
   * - DID_RECOVER
   */
  async appleIAPSubscription(subscriptionData: SubscriptionData) {
    const notificationType: AppleIAPNotificationType = subscriptionData.notification_type;
    console.log('Start Apple IAP Subscription: ', notificationType, subscriptionData);
    switch (notificationType) {
      case AppleIAPNotificationType.DID_RENEW:
        console.log('Start DID_RENEW subscription', subscriptionData);
        await this.handleRenewSubscription(subscriptionData);
        break;
      case AppleIAPNotificationType.INTERACTIVE_RENEWAL:
        console.log('Start INTERACTIVE_RENEWAL subscription', subscriptionData);
        await this.handleChangedSubscriptionPlan(subscriptionData);
        break;
      case AppleIAPNotificationType.DID_CHANGE_RENEWAL_STATUS:
        console.log('Start DID_CHANGE_RENEWAL_STATUS subscription', subscriptionData);
        await this.handleChangedSubscriptionPlan(subscriptionData);
        break;
      case AppleIAPNotificationType.DID_CHANGE_RENEWAL_PREF:
        console.log('Start DID_CHANGE_RENEWAL_PREF subscription', subscriptionData);
        await this.handleChangedSubscriptionPlan(subscriptionData);
        break;
      case AppleIAPNotificationType.DID_RECOVER:
        console.log('Start DID_RECOVER subscription', subscriptionData);
        await this.handleChangedSubscriptionPlan(subscriptionData);
        break;
      case AppleIAPNotificationType.CANCEL:
        console.log('Start CANCEL subscription', subscriptionData);
        await this.handleCancelSubscriptionPlan(subscriptionData);
        break;
      case AppleIAPNotificationType.DID_FAIL_TO_RENEW:
        console.log('Start DID_FAIL_TO_RENEW subscription', subscriptionData);
        await this.handleFailedRenewSubscription(subscriptionData);
        break;
    }
  }

  /**
   * 1. Validate latest receipt by apple validation
   * 2. Validate did renew transaction not existed
   * 3. Build transaction write to:
   *   - create transaction
   *   - create transaction history
   *   - update profile subscription
   *   - update profile premium
   */
  async handleRenewSubscription(subscriptionData: SubscriptionData) {
    const unifiedReceipt: UnifiedReceipt = subscriptionData.unified_receipt;
    const latestReceipt: string = unifiedReceipt.latest_receipt;

    // 1. Validate latest receipt by apple validation
    const iapSharedSecret = subscriptionData.password;
    const excludeOldTransactions = true;
    const validatedReceipt: ResponseReceiptValidation = await appleIAPService.validateReceiptByApple(latestReceipt, iapSharedSecret, excludeOldTransactions);
    console.log('Validated latestReceipt: ', validatedReceipt);
    const latestReceiptInfo: LatestReceiptInfo = validatedReceipt.latest_receipt_info?.[0];
    if (!latestReceiptInfo) {
      console.log('DID_RENEW - latestReceiptInfo not found');
      throw new BadRequestException('Missing latest receipt info');
    }

    // 2. Validate did renew transaction not existed
    const originalTransactionID = latestReceiptInfo.original_transaction_id;
    const appleTransactionID = latestReceiptInfo.transaction_id;
    const existedDidRenewTransaction: Transaction = await this.getTransactionByAppleTransactionID(appleTransactionID);
    if (existedDidRenewTransaction) {
      console.log('DID_RENEW subscription is existed', existedDidRenewTransaction);
      return;
    }

    // 3. Build transaction write
    const transactionID: string = uuidv4();
    const now = new Date().toISOString();
    const existedTransaction: Transaction = await this.getTransactionByOriginalTransactionID(originalTransactionID);
    console.log('Handle DID_RENEW subscription for existed original transaction ', existedTransaction, subscriptionData);
    const profileID: string = existedTransaction.profileID;
    const appleProductID = latestReceiptInfo.product_id;
    const latestProfileSubscription: ProfileSubscription = await profileSubscriptionService.getProfileSubscriptionByProfileIDAndAppleProductID(profileID, appleProductID);
    if (!latestProfileSubscription) {
      console.log('latestProfileSubscription not found');
      return;
    }
    const profileSubscriptionID: string = latestProfileSubscription.id;
    const expiredAt = new Date(Number(latestReceiptInfo.expires_date_ms)).toISOString();

    await this.saveReceiptToS3(transactionID, latestReceipt);
    await dynamoDBService.transactionWrite({
      TransactItems: [
        this.buildUpdateProfileMemberShip(profileID, MemberShip.PREMIUM),
        this.buildCreateTransaction({
          id: transactionID,
          profileID,
          state: TransactionState.SUCCEED,
          originalTransactionID,
          appleTransactionID,
          profileSubscriptionID,
          createdAt: now,
          updatedAt: now,
        }),
        this.buildCreateTransactionHistory({
          id: uuidv4(),
          transactionID,
          state: TransactionHistoryState.SUCCEED,
          createdAt: now,
          updatedAt: now,
        }),
        this.buildUpdateProfileSubscription(profileSubscriptionID, {
          status: ProfileSubscriptionStatus.ACTIVATED,
          expiredAt: new Date(expiredAt).toISOString(),
        }),
      ]
    });
  }

  /**
   * 1. Validate latest receipt by apple validation
   * 2. Validate interactive renewal transaction not existed
   * 3. Create new profile subscription if plan is not existed
   * 4. Build transaction write to:
   *   - create transaction
   *   - create transaction history
   *   - create/update profile subscription
   *   - update profile premium
   */
  async handleChangedSubscriptionPlan(subscriptionData: SubscriptionData) {
    const unifiedReceipt: UnifiedReceipt = subscriptionData.unified_receipt;
    const latestReceipt: string = unifiedReceipt.latest_receipt;

    // 1. Validate latest receipt by apple validation
    const iapSharedSecret = subscriptionData.password;
    const excludeOldTransactions = true;
    const validatedReceipt: ResponseReceiptValidation = await appleIAPService.validateReceiptByApple(latestReceipt, iapSharedSecret, excludeOldTransactions);
    console.log('Validated latestReceipt: ', validatedReceipt);
    const latestReceiptInfo: LatestReceiptInfo = validatedReceipt.latest_receipt_info?.[0];
    if (!latestReceiptInfo) {
      console.log('latestReceiptInfo not found');
      throw new BadRequestException('Missing latest receipt info');
    }

    // 2. Validate transaction is not existed
    const originalTransactionID = latestReceiptInfo.original_transaction_id;
    const appleTransactionID = latestReceiptInfo.transaction_id;
    const existedTransactionByAppleTransaction: Transaction = await this.getTransactionByAppleTransactionID(appleTransactionID);
    if (existedTransactionByAppleTransaction) {
      console.log('Subscription is existed', existedTransactionByAppleTransaction);
      return;
    }

    const transactionID: string = uuidv4();
    const now = new Date().toISOString();
    const existedTransaction: Transaction = await this.getTransactionByOriginalTransactionID(originalTransactionID);
    const profileID: string = existedTransaction.profileID;

    // 3. Create new profile subscription if plan is not existed
    const appleProductID = latestReceiptInfo.product_id;
    const latestProfileSubscription: ProfileSubscription = await profileSubscriptionService.getProfileSubscriptionByProfileIDAndAppleProductID(profileID, appleProductID);
    console.log('Handle subscription for existed profile subscription', latestProfileSubscription);
    const expiredAt = new Date(Number(latestReceiptInfo.expires_date_ms)).toISOString();
    let profileSubscriptionID: string;
    let profileSubscriptionTransaction;
    if (latestProfileSubscription) {
      profileSubscriptionID = latestProfileSubscription.id;
      profileSubscriptionTransaction = this.buildUpdateProfileSubscription(profileSubscriptionID, {
        status: ProfileSubscriptionStatus.ACTIVATED,
        expiredAt,
      });
    } else {
      profileSubscriptionID = uuidv4();
      profileSubscriptionTransaction = this.buildCreateProfileSubscription({
        id: profileSubscriptionID,
        profileID,
        appleProductID: latestReceiptInfo.product_id,
        status: ProfileSubscriptionStatus.ACTIVATED,
        activatedAt: new Date(Number(latestReceiptInfo.purchase_date_ms)).toISOString(),
        expiredAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.saveReceiptToS3(transactionID, latestReceipt);

    // 4. Build transaction write
    await dynamoDBService.transactionWrite({
      TransactItems: [
        this.buildUpdateProfileMemberShip(profileID, MemberShip.PREMIUM),
        this.buildCreateTransaction({
          id: transactionID,
          profileID,
          state: TransactionState.SUCCEED,
          originalTransactionID,
          appleTransactionID,
          profileSubscriptionID,
          createdAt: now,
          updatedAt: now,
        }),
        this.buildCreateTransactionHistory({
          id: uuidv4(),
          transactionID,
          state: TransactionHistoryState.SUCCEED,
          createdAt: now,
          updatedAt: now,
        }),
        profileSubscriptionTransaction,
      ]
    });
  }

  /**
   * 1. Validate latest receipt by apple validation
   * 2. Get profile subscription from apple transaction id
   * 3. Build transaction write to:
   *   - update profile subscription to expired
   *   - update profile premium to none
   */
  async handleCancelSubscriptionPlan(subscriptionData: SubscriptionData) {
    const unifiedReceipt: UnifiedReceipt = subscriptionData.unified_receipt;
    const latestReceipt: string = unifiedReceipt.latest_receipt;

    // 1. Validate latest receipt by apple validation
    const iapSharedSecret = subscriptionData.password;
    const excludeOldTransactions = true;
    const validatedReceipt: ResponseReceiptValidation = await appleIAPService.validateReceiptByApple(latestReceipt, iapSharedSecret, excludeOldTransactions);
    console.log('Validated latestReceipt: ', validatedReceipt);
    const latestReceiptInfo: LatestReceiptInfo = validatedReceipt.latest_receipt_info?.[0];
    if (!latestReceiptInfo) {
      console.log('latestReceiptInfo not found');
      throw new BadRequestException('Missing latest receipt info');
    }

    // 2. Get profile subscription from apple transaction id
    const now = new Date().toISOString();
    const transactionID: string = uuidv4();
    const originalTransactionID = latestReceiptInfo.original_transaction_id;
    const existedTransaction: Transaction = await this.getTransactionByOriginalTransactionID(originalTransactionID);
    const profileID: string = existedTransaction.profileID;
    const appleProductID = latestReceiptInfo.product_id;
    const cancellationDate = new Date(Number(latestReceiptInfo.cancellation_date_ms) || now).toISOString();
    const cancellationReason = CancellationReason[latestReceiptInfo.cancellation_reason || 0]; // Default is unknown reason
    const latestProfileSubscription: ProfileSubscription = await profileSubscriptionService.getProfileSubscriptionByProfileIDAndAppleProductID(profileID, appleProductID);
    console.log('Handle subscription for existed profile subscription', existedTransaction, subscriptionData);
    const profileSubscriptionID = latestProfileSubscription.id;

    // 3. Build transaction write
    await dynamoDBService.transactionWrite({
      TransactItems: [
        this.buildUpdateProfileMemberShip(profileID, MemberShip.NONE),
        this.buildCreateTransaction({
          id: transactionID,
          profileID,
          state: TransactionState.CANCELED,
          originalTransactionID,
          profileSubscriptionID,
          cancellationReason,
          createdAt: now,
          updatedAt: now,
        }),
        this.buildCreateTransactionHistory({
          id: uuidv4(),
          transactionID,
          state: TransactionHistoryState.CANCELED,
          createdAt: now,
          updatedAt: now,
        }),
        this.buildUpdateProfileSubscription(profileSubscriptionID, {
          status: ProfileSubscriptionStatus.INACTIVATED,
          expiredAt: cancellationDate,
        }),
      ]
    });
  }

  /**
   * 1. Create failed transaction history
   * 2. Update membership to NONE
   * 3. Update profile subscription with latest receipt
   */
  async handleFailedRenewSubscription(subscriptionData: SubscriptionData) {
    const unifiedReceipt: UnifiedReceipt = subscriptionData.unified_receipt;
    const latestReceipt: string = unifiedReceipt.latest_receipt;

    // Validate latest receipt by apple validation
    const iapSharedSecret = subscriptionData.password;
    const excludeOldTransactions = true;
    const validatedReceipt: ResponseReceiptValidation = await appleIAPService.validateReceiptByApple(latestReceipt, iapSharedSecret, excludeOldTransactions);
    console.log('Validated latestReceipt: ', validatedReceipt);
    const latestReceiptInfo: LatestReceiptInfo = validatedReceipt.latest_receipt_info?.[0];
    if (!latestReceiptInfo) {
      console.log('latestReceiptInfo not found');
      throw new BadRequestException('Missing latest receipt info');
    }

    // Get profile subscription from apple transaction id
    const now = new Date().toISOString();
    const transactionID: string = uuidv4();
    const originalTransactionID = latestReceiptInfo.original_transaction_id;
    const existedTransaction: Transaction = await this.getTransactionByOriginalTransactionID(originalTransactionID);
    const profileID: string = existedTransaction.profileID;
    const appleProductID = latestReceiptInfo.product_id;
    const expirationIntent = subscriptionData.expiration_intent || unifiedReceipt.pending_renewal_info?.[0]?.expiration_intent;
    const failedReason: string = ExpirationReason[Number(expirationIntent)] || 'Unknown Error. Please help contact support.';
    const latestProfileSubscription: ProfileSubscription = await profileSubscriptionService.getProfileSubscriptionByProfileIDAndAppleProductID(profileID, appleProductID);
    console.log('Handle subscription for existed profile subscription', existedTransaction, subscriptionData);
    const profileSubscriptionID = latestProfileSubscription.id;

    // Build transaction write
    await dynamoDBService.transactionWrite({
      TransactItems: [
        this.buildUpdateProfileMemberShip(profileID, MemberShip.NONE),
        this.buildCreateTransaction({
          id: transactionID,
          profileID,
          state: TransactionState.FAILED,
          originalTransactionID,
          profileSubscriptionID,
          failedReason,
          createdAt: now,
          updatedAt: now,
        }),
        this.buildCreateTransactionHistory({
          id: uuidv4(),
          transactionID,
          state: TransactionHistoryState.FAILED,
          createdAt: now,
          updatedAt: now,
        }),
        this.buildUpdateProfileSubscription(profileSubscriptionID, { status: ProfileSubscriptionStatus.INACTIVATED }),
      ]
    });
  }

  buildDeleteTransaction(transactionID: string) {
    return {
      Delete: {
        TableName: API_SITWITHME_TRANSACTIONTABLE_NAME,
        Key: { id: transactionID }
      }
    }
  }

  buildDeleteTransactionHistory(transactionHistoryID: string) {
    return {
      Delete: {
        TableName: API_SITWITHME_TRANSACTIONHISTORYTABLE_NAME,
        Key: { id: transactionHistoryID }
      }
    }
  }

  buildCreateTransaction(transaction: CreateTransactionInput) {
    return {
      Put: {
        TableName: API_SITWITHME_TRANSACTIONTABLE_NAME,
        Item: transaction
      }
    }
  }

  buildUpdateTransaction(id: string, transaction: UpdateTransactionInput) {
    return {
      Update: {
        TableName: API_SITWITHME_TRANSACTIONTABLE_NAME,
        Key: { id },
        ...dynamoDBService.buildUpdateExpression({
          'SET': transaction
        }),
      }
    }
  }

  buildCreateProfileSubscription(profileSubscriptionTransaction: CreateProfileSubscriptionTransactionInput) {
    return {
      Put: {
        TableName: API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
        Item: profileSubscriptionTransaction
      }
    }
  }

  buildUpdateProfileSubscription(id: string, profileSubscriptionTransaction: UpdateProfileSubscriptionTransactionInput) {
    return {
      Update: {
        TableName: API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
        Key: { id },
        ...dynamoDBService.buildUpdateExpression({
          'SET': profileSubscriptionTransaction
        }),
      }
    }
  }

  buildCreateTransactionHistory(transactionHistory: CreateTransactionHistoryInput) {
    return {
      Put: {
        TableName: API_SITWITHME_TRANSACTIONHISTORYTABLE_NAME,
        Item: transactionHistory
      }
    }
  }

  buildUpdateProfileMemberShip(id: string, memberShip: MemberShip) {
    return {
      Update: {
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        Key: { id },
        ...dynamoDBService.buildUpdateExpression({
          'SET': { memberShip }
        }),
      }
    }
  }

  async saveReceiptToS3(transactionID: string, receipt: string) {
    const buffer = Buffer.from(receipt, 'utf8');;
    await s3Service.putObject({
      Body: buffer,
      Bucket: STORAGE_DOCS_BUCKETNAME,
      ContentType: 'text/plain',
      Key: `${TransactionConst.bucketReceiptPath}/${transactionID}`,
      StorageClass: 'STANDARD'
    });
  }

  async getTransactionByProfileIDAndReceipt(profileID: string, receipt: string): Promise<Transaction> {
    const params = {
      TableName: API_SITWITHME_TRANSACTIONTABLE_NAME,
      IndexName: 'byProfileIDSortByCreatedAt',
      KeyConditionExpression: '#profileID = :profileID',
      FilterExpression: '#receipt = :receipt',
      ExpressionAttributeNames: {
        '#receipt': 'receipt',
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':receipt': receipt,
        ':profileID': profileID
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items[0] as Transaction;
    }
  }

  async allTransactionsByProfileID(profileID: string): Promise<Transaction[]> {
    const params = {
      TableName: API_SITWITHME_TRANSACTIONTABLE_NAME,
      IndexName: 'byProfileIDSortByCreatedAt',
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };

    const result = await dynamoDBService.queryAll(params);
    if (result.length) {
      return result as Transaction[];
    }

    return [];
  }

  async allTransactionHistoriesByTransactionID(transactionID: string): Promise<TransactionHistory[]> {
    const params = {
      TableName: API_SITWITHME_TRANSACTIONHISTORYTABLE_NAME,
      IndexName: 'byTransactionIDSortByCreatedAt',
      KeyConditionExpression: '#transactionID = :transactionID',
      ExpressionAttributeNames: {
        '#transactionID': 'transactionID'
      },
      ExpressionAttributeValues: {
        ':transactionID': transactionID
      }
    };

    const result = await dynamoDBService.queryAll(params);
    if (result.length) {
      return result as TransactionHistory[];
    }

    return [];
  }

  async deleteTransactionHistories(keys: any[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_TRANSACTIONHISTORYTABLE_NAME,
      keys.map(key => ({ id: key.id }))
    );
  }

  async deleteTransactions(keys: any[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_TRANSACTIONTABLE_NAME,
      keys.map(key => ({ id: key.id }))
    );
  }

  async getTransactionByOriginalTransactionID(originalTransactionID: string): Promise<Transaction> {
    const params = {
      TableName: API_SITWITHME_TRANSACTIONTABLE_NAME,
      IndexName: 'byOriginalTransactionID',
      KeyConditionExpression: '#originalTransactionID = :originalTransactionID',
      ExpressionAttributeNames: {
        '#originalTransactionID': 'originalTransactionID'
      },
      ExpressionAttributeValues: {
        ':originalTransactionID': originalTransactionID
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items[0] as Transaction;
    }
  }

  async getTransactionByAppleTransactionID(appleTransactionID: string): Promise<Transaction> {
    const params = {
      TableName: API_SITWITHME_TRANSACTIONTABLE_NAME,
      IndexName: 'byAppleTransactionID',
      KeyConditionExpression: '#appleTransactionID = :appleTransactionID',
      ExpressionAttributeNames: {
        '#appleTransactionID': 'appleTransactionID',
      },
      ExpressionAttributeValues: {
        ':appleTransactionID': appleTransactionID,
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items[0] as Transaction;
    }
  }
}