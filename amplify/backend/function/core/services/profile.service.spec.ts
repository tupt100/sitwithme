import { DynamoDBService } from './dynamodb.service';
import { ProfileService } from './profile.service';
import { v4 as uuidv4 } from 'uuid';
import { PaymentLinks, Profile, UpdateProfile } from '@swm-core/interfaces/profile.interface';
import { UserService } from './user.service';
import { User } from '@swm-core/interfaces/user.interface';
jest.mock('uuid');
jest.mock('./dynamodb.service');

const profileService = new ProfileService();
const dynamoDBService = DynamoDBService.prototype;
const userService = UserService.prototype;
const uuidv4Service = { uuidv4 };

describe('ProfileService', function () {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('createPatron', function () {
    it('Should return patron profile after created successful', async function () {
      const userID: string = 'userID';
      const profileID: string = 'profileID';
      jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => profileID);
      jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
      jest.spyOn(userService, 'get').mockImplementation(async (userID) => {return { firstName: 'John', lastName: 'Smith' } as User});

      const createPatron: Profile = await profileService.createPatron(userID);
      expect(createPatron).toEqual({
        '__typename': 'Profile',
        'createdAt': createPatron.createdAt,
        'id': 'profileID',
        'memberShip': 'NONE',
        'notificationSettings': {
          'muteAll': false,
          'muteMessage': false,
          'muteSWMRequest': false
        },
        'onboardingStep': 'ADD_PHOTO',
        'postCount': 0,
        'role': 'PATRON',
        'sittingWithTotal': 0,
        'userConnection': { 'fullName': 'John Smith' },
        'userID': userID
      });
    });
  });

  describe('validatePaymentLinks', () => {
    describe('success', () => {
      it('should return undefined if payment links are valid', () => {
        const paymentLinks: PaymentLinks = {
          venmo: 'https://venmo.com/abc',
          paypal: 'https://paypal.me/abc'
        };
        const result = profileService.validatePaymentLinks(paymentLinks);
        expect(result).toBe(undefined);

        const paymentLinks1: PaymentLinks = {
          venmo: 'https://www.venmo.com/abc',
          paypal: 'https://www.paypal.me/abc'
        };
        const result1 = profileService.validatePaymentLinks(paymentLinks1);
        expect(result1).toBe(undefined);

        const paymentLinks2: PaymentLinks = {
          venmo: 'https://venmo.com/abc',
          paypal: 'https://paypal.me/abc'
        };
        const result2 = profileService.validatePaymentLinks(paymentLinks2);
        expect(result2).toBe(undefined);

        const paymentLinks3: PaymentLinks = {
          venmo: 'http://venmo.com/abc',
          paypal: 'http://paypal.com/paypalme/abc'
        };
        const result3 = profileService.validatePaymentLinks(paymentLinks3);
        expect(result3).toBe(undefined);

        const paymentLinks4: PaymentLinks = {
          venmo: 'venmo.com/abc',
          paypal: 'paypal.com/paypalme/abc'
        };
        const result4 = profileService.validatePaymentLinks(paymentLinks4);
        expect(result4).toBe(undefined);
      });
    });
    describe('error', () => {
      it('should throw error if payment links are invalid', () => {
        const paymentLinks: PaymentLinks = {
          venmo: 'https://venmo/abc',
          paypal: 'https://paypal.mee/abc'
        };
        expect(() => profileService.validatePaymentLinks(paymentLinks)).toThrow('Validation failed');
      });
    });
  });

  describe('normalizeProfileInput', () => {
    it('should return normalized profile input', () => {
      const profile: UpdateProfile = {
        id: uuidv4(),
        bio: ' abc  ',
        avatar: undefined,
        privacy: true,
        paypalLink: null,
        showInExplore: false,
      };
      expect(profileService.normalizeProfileInput(profile)).toStrictEqual({
        bio: 'abc',
        privacy: true,
        paypalLink: null,
        showInExplore: false,
      })
    });
  });
});
