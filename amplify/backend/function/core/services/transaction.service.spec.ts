import { DynamoDBService } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { TransactionService } from './transaction.service';
import { AppleIAPService } from './apple-iap.service';
import { AppleIAPNotificationType, ResponseReceiptValidation, SubscriptionData } from '@swm-core/interfaces/apple-iap.interface';
import { ProfileSubscriptionService } from './profile-subscription.service';
import { SSMService } from './ssm.service';
import { CreateTransactionHistoryInput, CreateTransactionInput, Transaction, TransactionHistoryState, TransactionState, UpdateTransactionInput } from '@swm-core/interfaces/transaction.interface';
import { CreateProfileSubscriptionTransactionInput, ProfileSubscription, ProfileSubscriptionStatus, UpdateProfileSubscriptionTransactionInput } from '@swm-core/interfaces/profile-subscription.interface';
import { MemberShip } from '@swm-core/interfaces/profile.interface';
import { S3Service } from './s3.service';

const dynamoDBService = DynamoDBService.prototype;
const transactionService = new TransactionService();
const appleIAPService = AppleIAPService.prototype;
const profileSubscriptionService = ProfileSubscriptionService.prototype;
const ssmService = SSMService.prototype;
const s3Service = S3Service.prototype;
const uuidv4Service = { uuidv4 };

describe('TransactionService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('createReceipt', () => {
    describe('success', () => {
      it('should return true if validate receipt successful', async () => {
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
              "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(async () => { return { id: 'id' } as ProfileSubscription });
        jest.spyOn(ssmService, 'getParameter').mockImplementation(async () => { return { Parameter: { Value: '' } } as any });

        let isValidateReceiptSucceed = await transactionService.createReceipt({ profileID: '', receipt: 'test' });
        expect(isValidateReceiptSucceed).toEqual(true);

        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(() => null);

        isValidateReceiptSucceed = await transactionService.createReceipt({ profileID: '', receipt: 'test' });
        expect(isValidateReceiptSucceed).toEqual(true);
      });
      it('should return false if validate receipt failed', async () => {
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "status": 21006
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(ssmService, 'getParameter').mockImplementation(async () => { return { Parameter: { Value: '' } } as any });

        const isValidateReceiptSucceed = await transactionService.createReceipt({ profileID: '', receipt: 'test' });
        expect(isValidateReceiptSucceed).toEqual(false);
      });
      it('should return true if validate an existed succeed receipt with available expiredAt date', async () => {
        const now = new Date();
        const profileID: string = uuidv4();
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": now.getTime() + 3600, // Set available expiredAt > now
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(async () => { return {profileID} as Transaction });
        jest.spyOn(ssmService, 'getParameter').mockImplementation(async () => { return { Parameter: { Value: '' } } as any });

        const isValidateReceiptSucceed = await transactionService.createReceipt({ profileID, receipt: 'test' });
        expect(isValidateReceiptSucceed).toEqual(true);
      });
      it('should return false if validate an existed succeed receipt with unavailable expiredAt date', async () => {
        const now = new Date();
        const profileID: string = uuidv4();
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": now.getTime() - 10, // Set available expiredAt > now
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(async () => { return { profileID } as Transaction });
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(() => null);
        jest.spyOn(ssmService, 'getParameter').mockImplementation(async () => { return { Parameter: { Value: '' } } as any });

        const isValidateReceiptSucceed = await transactionService.createReceipt({ profileID, receipt: 'test' });
        expect(isValidateReceiptSucceed).toEqual(false);
      });
    });
    describe('error', () => {
      it('should throw error if validate receipt missing receipt info', async () => {
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(ssmService, 'getParameter').mockImplementation(async () => { return { Parameter: { Value: '' } } as any });

        await expect(transactionService.createReceipt({ profileID: '', receipt: 'test' })).rejects.toThrow('Missing latest receipt info');
      });

      it('should throw error if validate receipt does not match profileID', async () => {
        const now = new Date();
        const profileID: string = uuidv4();
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": now.getTime() + 3600, // Set available expiredAt > now
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(async () => { return { profileID } as Transaction });
        jest.spyOn(ssmService, 'getParameter').mockImplementation(async () => { return { Parameter: { Value: '' } } as any });

        await expect(transactionService.createReceipt({ profileID: uuidv4(), receipt: 'test' })).rejects.toThrowError();
      });
    });
  });

  describe('handleRenewSubscription', () => {
    describe('success', () => {
      it('should return undefined if DID_RENEW subscription is succeed', async () => {
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(transactionService, 'getTransactionByOriginalTransactionID').mockImplementation(async () => { return { profileID: "" } as Transaction});
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(() => null);

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_RENEW,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        const result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
      it('should return undefined if DID_RENEW subscription is existed', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(async() => { return {} as Transaction });

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_RENEW,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        let result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);

        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(() => null);
        result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
      it('should return undefined if DID_RENEW profile subscription is succeed', async () => {
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(transactionService, 'getTransactionByOriginalTransactionID').mockImplementation(async () => { return { profileID: "" } as Transaction });
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(async () => { return {} as ProfileSubscription });

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_RENEW,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        const result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
    });
    describe('error', () => {
      it('should throw error if validate receipt missing receipt info', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_RENEW,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        await expect(transactionService.appleIAPSubscription(subscriptionData)).rejects.toThrow('Missing latest receipt info');
      });
    });
  });

  describe('handleChangedSubscriptionPlan', () => {
    describe('success', () => {
      it('should return undefined if INTERACTIVE_RENEWAL subscription is succeed', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(transactionService, 'getTransactionByOriginalTransactionID').mockImplementation(async () => { return { profileID: "" } as Transaction });
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(async () => { return {} as ProfileSubscription });
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.INTERACTIVE_RENEWAL,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        let result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);

        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(() => null);

        result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
      it('should return undefined if INTERACTIVE_RENEWAL subscription is existed', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(async () => {return {} as Transaction });

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.INTERACTIVE_RENEWAL,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        const result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
      it('should return undefined if DID_CHANGE_RENEWAL_STATUS subscription is succeed', async () => {
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(transactionService, 'getTransactionByOriginalTransactionID').mockImplementation(async () => { return { profileID: "" } as Transaction });
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(async () => { return {} as ProfileSubscription });

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_CHANGE_RENEWAL_STATUS,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        const result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
      it('should return undefined if DID_CHANGE_RENEWAL_PREF subscription is succeed', async () => {
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(transactionService, 'getTransactionByOriginalTransactionID').mockImplementation(async () => { return { profileID: "" } as Transaction });
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(async () => { return {} as ProfileSubscription });

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_CHANGE_RENEWAL_PREF,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        const result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
      it('should return undefined if DID_RECOVER subscription is succeed', async () => {
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);
        jest.spyOn(transactionService, 'saveReceiptToS3').mockImplementation(() => null);
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(transactionService, 'getTransactionByOriginalTransactionID').mockImplementation(async () => { return { profileID: "" } as Transaction });
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(async () => { return {} as ProfileSubscription });

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_RECOVER,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        const result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
    });
    describe('error', () => {
      it('should throw error if validate receipt missing receipt info', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.INTERACTIVE_RENEWAL,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        await expect(transactionService.appleIAPSubscription(subscriptionData)).rejects.toThrow('Missing latest receipt info');
      });
    });
  });

  describe('handleCancelSubscriptionPlan', () => {
    describe('success', () => {
      it('should return undefined if CANCEL subscription is succeed', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(transactionService, 'getTransactionByOriginalTransactionID').mockImplementation(async () => { return { profileID: "" } as Transaction });
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(async () => { return {} as ProfileSubscription });
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.CANCEL,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        let result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
    });
    describe('error', () => {
      it('should throw error if validate receipt missing receipt info', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.CANCEL,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        await expect(transactionService.appleIAPSubscription(subscriptionData)).rejects.toThrow('Missing latest receipt info');
      });
    });
  });

  describe('handleFailedRenewSubscription', () => {
    describe('success', () => {
      it('should return undefined if CANCEL subscription is succeed', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [
              {
                "quantity": "1",
                "product_id": "swm.monthly.dev",
                "transaction_id": "1000000893819044",
                "original_transaction_id": "1000000883815771",
                "purchase_date": "2021-10-18 08:50:09 Etc/GMT",
                "purchase_date_ms": "1634547009000",
                "purchase_date_pst": "2021-10-18 01:50:09 America/Los_Angeles",
                "original_purchase_date": "2021-10-18 08:50:12 Etc/GMT",
                "original_purchase_date_ms": "1634547012000",
                "original_purchase_date_pst": "2021-10-18 01:50:12 America/Los_Angeles",
                "expires_date": "2021-10-18 08:55:09 Etc/GMT",
                "expires_date_ms": "1634547309000",
                "expires_date_pst": "2021-10-18 01:55:09 America/Los_Angeles",
                "web_order_line_item_id": "1000000066743721",
                "is_trial_period": "false",
                "is_in_intro_offer_period": "false",
                "in_app_ownership_type": "PURCHASED",
                "subscription_group_identifier": "20878432"
              }
            ],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        jest.spyOn(transactionService, 'getTransactionByAppleTransactionID').mockImplementation(() => null);
        jest.spyOn(transactionService, 'getTransactionByOriginalTransactionID').mockImplementation(async () => { return { profileID: "" } as Transaction });
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => 'id');
        jest.spyOn(profileSubscriptionService, 'getProfileSubscriptionByProfileIDAndAppleProductID').mockImplementation(async () => { return {} as ProfileSubscription });
        jest.spyOn(dynamoDBService, 'transactionWrite').mockImplementation(() => null);

        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_FAIL_TO_RENEW,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        let result = await transactionService.appleIAPSubscription(subscriptionData);
        expect(result).toEqual(undefined);
      });
    });
    describe('error', () => {
      it('should throw error if validate receipt missing receipt info', async () => {
        jest.spyOn(appleIAPService, 'validateReceiptByApple').mockImplementation(async () => {
          return {
            "environment": "Sandbox",
            "latest_receipt_info": [],
            "status": 0
          } as unknown as ResponseReceiptValidation
        });
        const subscriptionData: SubscriptionData = {
          "environment": "Sandbox",
          "unified_receipt": {
            "latest_receipt": "",
          },
          "notification_type": AppleIAPNotificationType.DID_FAIL_TO_RENEW,
          "auto_renew_product_id": "",
          "password": ""
        } as SubscriptionData;

        await expect(transactionService.appleIAPSubscription(subscriptionData)).rejects.toThrow('Missing latest receipt info');
      });
    });
  });

  describe('buildDeleteTransaction', () => {
    describe('success', () => {
      it('should return Delete transaction write for buildDeleteTransaction', () => {
        const transactionID = 'transactionID';
        const result = transactionService.buildDeleteTransaction(transactionID);
        expect(result).toEqual({
          Delete: {
            TableName: undefined,
            Key: { id: transactionID }
          }
        })
      })
    });
  });

  describe('buildDeleteTransactionHistory', () => {
    describe('success', () => {
      it('should return Delete transaction write for buildDeleteTransactionHistory', () => {
        const transactionHistoryID = 'transactionHistoryID';
        const result = transactionService.buildDeleteTransactionHistory(transactionHistoryID);
        expect(result).toEqual({
          Delete: {
            TableName: undefined,
            Key: { id: transactionHistoryID }
          }
        })
      })
    });
  });

  describe('buildCreateTransaction', () => {
    describe('success', () => {
      it('should return Put transaction write for buildCreateTransaction', () => {
        const now = new Date().toISOString();
        const transaction: CreateTransactionInput = {
          id: 'string',
          profileID: 'string',
          originalTransactionID: 'string',
          appleTransactionID: 'string',
          profileSubscriptionID: 'string',
          failedReason: 'string',
          cancellationReason: 'string',
          state: TransactionState.PENDING,
          createdAt: now,
          updatedAt: now,
        };
        const result = transactionService.buildCreateTransaction(transaction);

        expect(result).toEqual({
          Put: {
            TableName: undefined,
            Item: transaction
          }
        })
      })
    });
  });

  describe('buildUpdateTransaction', () => {
    describe('success', () => {
      it('should return Update transaction write for buildUpdateTransaction', () => {
        const transactionID = 'transactionID';
        const transaction: UpdateTransactionInput = {
          originalTransactionID: 'string',
          appleTransactionID: 'string',
          profileSubscriptionID: 'string',
          failedReason: 'string',
          cancellationReason: 'string',
          state: TransactionState.PENDING,
        };
        jest.spyOn(dynamoDBService, 'buildUpdateExpression').mockImplementation(() => null);

        const result = transactionService.buildUpdateTransaction(transactionID, transaction);
        expect(result).toEqual({
          Update: {
            TableName: undefined,
            Key: { id: transactionID },
          }
        })
      })
    });
  });

  describe('buildCreateProfileSubscription', () => {
    describe('success', () => {
      it('should return Put transaction write for buildCreateProfileSubscription', () => {
        const now = new Date().toISOString();
        const profileSubscriptionTransaction: CreateProfileSubscriptionTransactionInput = {
          id: 'string',
          profileID: 'string',
          appleProductID: 'string',
          status: ProfileSubscriptionStatus.ACTIVATED,
          activatedAt: now,
          expiredAt: now,
          createdAt: now,
          updatedAt: now,
        };
        const result = transactionService.buildCreateProfileSubscription(profileSubscriptionTransaction);
        expect(result).toEqual({
          Put: {
            TableName: undefined,
            Item: profileSubscriptionTransaction
          }
        })
      })
    });
  });

  describe('buildUpdateProfileSubscription', () => {
    describe('success', () => {
      it('should return Update transaction write for buildUpdateProfileSubscription', () => {
        const now = new Date().toISOString();
        const profileSubscriptionID = 'profileSubscriptionID';
        const profileSubscription: UpdateProfileSubscriptionTransactionInput = {
          status: ProfileSubscriptionStatus.INACTIVATED,
          expiredAt: now,
        };
        jest.spyOn(dynamoDBService, 'buildUpdateExpression').mockImplementation(() => null);

        const result = transactionService.buildUpdateProfileSubscription(profileSubscriptionID, profileSubscription);
        expect(result).toEqual({
          Update: {
            TableName: undefined,
            Key: { id: profileSubscriptionID },
          }
        })
      })
    });
  });

  describe('buildCreateTransactionHistory', () => {
    describe('success', () => {
      it('should return Put transaction write for buildCreateTransactionHistory', () => {
        const now = new Date().toISOString();
        const transactionHistory: CreateTransactionHistoryInput = {
          id: 'string',
          transactionID: 'string',
          state: TransactionHistoryState.FAILED,
          failedReason: 'string',
          createdAt: now,
          updatedAt: now,
        };
        const result = transactionService.buildCreateTransactionHistory(transactionHistory);
        expect(result).toEqual({
          Put: {
            TableName: undefined,
            Item: transactionHistory
          }
        })
      })
    });
  });

  describe('buildUpdateProfileMemberShip', () => {
    describe('success', () => {
      it('should return Update transaction write for buildUpdateProfileMemberShip', () => {
        const profileID = 'profileID';
        const memberShip = MemberShip.PREMIUM;
        jest.spyOn(dynamoDBService, 'buildUpdateExpression').mockImplementation(() => null);

        const result = transactionService.buildUpdateProfileMemberShip(profileID, memberShip);
        expect(result).toEqual({
          Update: {
            TableName: undefined,
            Key: { id: profileID },
          }
        })
      })
    });
  });

  describe('saveReceiptToS3', () => {
    describe('success', () => {
      it('should return undefined for saveReceiptToS3', async () => {
        const transactionID = 'transactionID';
        const receipt = 'receipt';
        jest.spyOn(s3Service, 'putObject').mockImplementation(() => null);

        const result = await transactionService.saveReceiptToS3(transactionID, receipt);
        expect(result).toEqual(undefined);
      })
    });
  });

  describe('getTransactionByProfileIDAndReceipt', () => {
    describe('success', () => {
      it('should return transaction by profileID and receipt', async () => {
        const now = new Date().toISOString();
        const profileID = 'profileID';
        const transaction: Transaction = {
          id: 'string',
          profileID: 'string',
          originalTransactionID: 'string',
          appleTransactionID: 'string',
          profileSubscriptionID: 'string',
          failedReason: 'string',
          cancellationReason: 'string',
          state: TransactionState.PENDING,
          createdAt: now,
          updatedAt: now,
        };
        const receipt = 'receipt';
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: [transaction] } });

        const result = await transactionService.getTransactionByProfileIDAndReceipt(profileID, receipt);
        expect(transaction).toMatchObject(result);
      });
    });
  });

  describe('getTransactionByOriginalTransactionID', () => {
    describe('success', () => {
      it('should return transaction by original transaction id', async () => {
        const now = new Date().toISOString();
        const originalTransactionID = 'originalTransactionID';
        const transaction: Transaction = {
          id: 'string',
          profileID: 'string',
          originalTransactionID: 'string',
          appleTransactionID: 'string',
          profileSubscriptionID: 'string',
          failedReason: 'string',
          cancellationReason: 'string',
          state: TransactionState.PENDING,
          createdAt: now,
          updatedAt: now,
        };
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: [transaction] } });

        const result = await transactionService.getTransactionByOriginalTransactionID(originalTransactionID);
        expect(transaction).toMatchObject(result);
      });
    });
  });

  describe('getTransactionByAppleTransactionID', () => {
    describe('success', () => {
      it('should return transaction by apple transaction id', async () => {
        const now = new Date().toISOString();
        const transactionID = 'transactionID';
        const transaction: Transaction = {
          id: transactionID,
          profileID: 'string',
          originalTransactionID: 'string',
          appleTransactionID: 'string',
          profileSubscriptionID: 'string',
          failedReason: 'string',
          cancellationReason: 'string',
          state: TransactionState.PENDING,
          createdAt: now,
          updatedAt: now,
        };
        const appleTransactionID = 'appleTransactionID';
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: [transaction] } });

        const result = await transactionService.getTransactionByAppleTransactionID(appleTransactionID);
        expect(transaction).toMatchObject(result);
      });
    });
  });
});
