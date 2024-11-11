import { OnboardingService } from './onboarding.service';
import { DynamoDBService } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from './user.service';
import { User, UserLocation } from '@swm-core/interfaces/user.interface';
import { ProfileService } from './profile.service';
import { MemberShip, OnboardingStep, PatronProfile, PaymentLinks, Profile, StaffProfile, UserRole } from '@swm-core/interfaces/profile.interface';
import { PhotoService } from './photo.service';
import { Photo } from '@swm-core/interfaces/photo.interface';
import { S3Object } from '@swm-core/interfaces/file.interface';
import { ShiftInputRequest } from '@swm-core/interfaces/shift.interface';
import { ShiftService } from './shift.service';
import { S3Service } from './s3.service';

const onboardingService = new OnboardingService();
const dynamoDBService = DynamoDBService.prototype;
const userService = UserService.prototype;
const profileService = ProfileService.prototype;
const photoService = PhotoService.prototype;
const shiftService = ShiftService.prototype;
const s3Service = S3Service.prototype;
const uuidv4Service = { uuidv4 };

describe('onboardingService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('onboardingPatron', () => {
    describe('success', () => {
      it('should return Patron with onboardingStep is ADD_PHOTO after init onboarding Patron', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getPatronByUserID').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);

        const result = await onboardingService.onboardingPatron(userID);
        expect(result).toMatchObject({
          __typename: 'Profile',
          role: UserRole.PATRON,
          userID,
          onboardingStep: OnboardingStep.ADD_PHOTO,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          memberShip: MemberShip.NONE,
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
        });
      });
      it('should return Patron with onboardingStep is ADD_LOCATION after add photo', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const patron: PatronProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.PATRON,
          userID,
          onboardingStep: OnboardingStep.ADD_PHOTO,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          memberShip: MemberShip.NONE,
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const patronPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getPatronByUserID').mockImplementation(async () => patron);
        jest.spyOn(photoService, 'get').mockImplementation(async () => {return {} as Photo});
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...patron,
              avatarID: photoID,
              onboardingStep: OnboardingStep.ADD_LOCATION,
            }
          } as any
        });

        let result = await onboardingService.onboardingPatron(userID, patronPhoto);
        expect(result).toMatchObject({
          ...patron,
          avatarID: photoID,
          onboardingStep: OnboardingStep.ADD_LOCATION,
        });

        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...patron,
              avatarID: null,
              onboardingStep: OnboardingStep.ADD_LOCATION,
            }
          } as any
        });
        result = await onboardingService.onboardingPatron(userID, null);
        expect(result).toMatchObject({
          ...patron,
          avatarID: null,
          onboardingStep: OnboardingStep.ADD_LOCATION,
        });
      });
      it('should return Patron with onboardingStep is COMPLETED after add location', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const now = new Date().toISOString();
        const patron: PatronProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.PATRON,
          userID,
          onboardingStep: OnboardingStep.ADD_PHOTO,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          memberShip: MemberShip.NONE,
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const patronPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        const userLocation: UserLocation = {
          name: 'location name',
          location: {
            latitude: 1,
            longitude: 1,
          }
        }
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getPatronByUserID').mockImplementation(async () => patron);
        jest.spyOn(photoService, 'get').mockImplementation(async () => { return {} as Photo });
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...patron,
              avatarID: photoID,
              onboardingStep: OnboardingStep.COMPLETED,
              completedAt: now,
            }
          } as any
        });
        jest.spyOn(userService, 'update').mockImplementation(() => null);

        let result = await onboardingService.onboardingPatron(userID, patronPhoto, userLocation);
        expect(result).toMatchObject({
          ...patron,
          avatarID: photoID,
          onboardingStep: OnboardingStep.COMPLETED,
          completedAt: now,
        });

        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...patron,
              avatarID: null,
              onboardingStep: OnboardingStep.COMPLETED,
              completedAt: now,
            }
          } as any
        });
        result = await onboardingService.onboardingPatron(userID, patronPhoto, null);
        expect(result).toMatchObject({
          ...patron,
          avatarID: null,
          onboardingStep: OnboardingStep.COMPLETED,
          completedAt: now,
        });
      });
    });
    describe('error', () => {
      it('should throw error if onboarding with user missing basic info', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => false);

        await expect(onboardingService.onboardingPatron(userID)).rejects.toThrowError('Please fill the user basic information first.');
      });
    });
  });

  describe('onboardingStaff', () => {
    describe('success', () => {
      it('should return Staff with onboardingStep is ADD_PHOTO after init onboarding Staff', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);

        const result = await onboardingService.onboardingStaff(userID);
        expect(result).toMatchObject({
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_PHOTO,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
        });
      });
      it('should return Staff with onboardingStep is ADD_LOCATION after add photo', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_LOCATION,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const staffPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);
        jest.spyOn(photoService, 'get').mockImplementation(async () => { return {} as Photo });
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: photoID,
              onboardingStep: OnboardingStep.ADD_LOCATION,
            }
          } as any
        });

        let result = await onboardingService.onboardingStaff(userID, staffPhoto);
        expect(result).toMatchObject({
          ...staff,
          avatarID: photoID,
          onboardingStep: OnboardingStep.ADD_LOCATION,
        });

        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: null,
              onboardingStep: OnboardingStep.ADD_LOCATION,
            }
          } as any
        });
        result = await onboardingService.onboardingStaff(userID, null);
        expect(result).toMatchObject({
          ...staff,
          avatarID: null,
          onboardingStep: OnboardingStep.ADD_LOCATION,
        });
      });
      it('should return Staff with onboardingStep is ADD_SHIFT after add location', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_LOCATION,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const staffPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        const userLocation: UserLocation = {
          name: 'location name',
          location: {
            latitude: 1,
            longitude: 1,
          }
        }
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);
        jest.spyOn(photoService, 'get').mockImplementation(async () => { return {} as Photo });
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: photoID,
              onboardingStep: OnboardingStep.ADD_SHIFT,
            }
          } as any
        });
        jest.spyOn(userService, 'update').mockImplementation(() => null);

        let result = await onboardingService.onboardingStaffV2(userID, staffPhoto, userLocation);
        expect(result).toMatchObject({
          ...staff,
          avatarID: photoID,
          onboardingStep: OnboardingStep.ADD_SHIFT,
        });
      });
      it('should return Staff with onboardingStep is COMPLETED after add shift', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const now = new Date().toISOString();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_SHIFT,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const staffPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        const userLocation: UserLocation = {
          name: 'location name',
          location: {
            latitude: 1,
            longitude: 1,
          }
        };
        const shiftInput: ShiftInputRequest = {
          jobID: 'string',
          start: now,
          end: now,
          workplaceID: 'string',
        }
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);
        jest.spyOn(photoService, 'get').mockImplementation(async () => { return {} as Photo });
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: photoID,
              onboardingStep: OnboardingStep.COMPLETED,
              completedAt: now,
            }
          } as any
        });
        jest.spyOn(userService, 'update').mockImplementation(() => null);
        jest.spyOn(shiftService, 'create').mockImplementation(() => null);

        let result = await onboardingService.onboardingStaff(userID, staffPhoto, userLocation, shiftInput);
        expect(result).toMatchObject({
          ...staff,
          avatarID: photoID,
          onboardingStep: OnboardingStep.COMPLETED,
          completedAt: now,
        });

        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: null,
              onboardingStep: OnboardingStep.COMPLETED,
              completedAt: now,
            }
          } as any
        });
        result = await onboardingService.onboardingStaff(userID, staffPhoto, userLocation, shiftInput);
        expect(result).toMatchObject({
          ...staff,
          avatarID: null,
          onboardingStep: OnboardingStep.COMPLETED,
          completedAt: now,
        });
      });
    });
    describe('error', () => {
      it('should throw error if onboarding with user missing basic info', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => false);

        await expect(onboardingService.onboardingStaff(userID)).rejects.toThrowError('Please fill the user basic information first.');
      });
      it('should throw error if onboarding with completed staff', async () => {
        const userID: string = uuidv4();
        const photoID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const now = new Date().toISOString();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_SHIFT,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          completedAt: now,
          postCount: 0,
        };
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);

        await expect(onboardingService.onboardingStaff(userID)).rejects.toThrowError('This staff already onboarding');
      });
    });
  });

  describe('onboardingStaffV2', () => {
    describe('success', () => {
      it('should return Staff with onboardingStep is ADD_PHOTO after init onboarding Staff', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);

        const result = await onboardingService.onboardingStaffV2(userID);
        expect(result).toMatchObject({
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_PHOTO,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
        });
      });
      it('should return Staff with onboardingStep is ADD_LOCATION after add photo', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_LOCATION,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const staffPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);
        jest.spyOn(photoService, 'get').mockImplementation(async () => { return {} as Photo });
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: photoID,
              onboardingStep: OnboardingStep.ADD_LOCATION,
            }
          } as any
        });

        let result = await onboardingService.onboardingStaffV2(userID, staffPhoto);
        expect(result).toMatchObject({
          ...staff,
          avatarID: photoID,
          onboardingStep: OnboardingStep.ADD_LOCATION,
        });

        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: null,
              onboardingStep: OnboardingStep.ADD_LOCATION,
            }
          } as any
        });
        result = await onboardingService.onboardingStaffV2(userID, null);
        expect(result).toMatchObject({
          ...staff,
          avatarID: null,
          onboardingStep: OnboardingStep.ADD_LOCATION,
        });
      });
      it('should return Staff with onboardingStep is ADD_PAYMENT_LINK after add location', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_LOCATION,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const staffPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        const userLocation: UserLocation = {
          name: 'location name',
          location: {
            latitude: 1,
            longitude: 1,
          }
        }
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);
        jest.spyOn(photoService, 'get').mockImplementation(async () => { return {} as Photo });
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: photoID,
              onboardingStep: OnboardingStep.ADD_PAYMENT_LINK,
            }
          } as any
        });
        jest.spyOn(userService, 'update').mockImplementation(() => null);

        let result = await onboardingService.onboardingStaffV2(userID, staffPhoto, userLocation);
        expect(result).toMatchObject({
          ...staff,
          avatarID: photoID,
          onboardingStep: OnboardingStep.ADD_PAYMENT_LINK,
        });
      });
      it('should return Staff with onboardingStep is ADD_SHIFT after add payment links', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_PAYMENT_LINK,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const staffPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        const userLocation: UserLocation = {
          name: 'location name',
          location: {
            latitude: 1,
            longitude: 1,
          }
        };
        const paymentLinks: PaymentLinks = {
          venmo: null,
          paypal: null,
        }
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);
        jest.spyOn(photoService, 'get').mockImplementation(async () => { return {} as Photo });
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: photoID,
              onboardingStep: OnboardingStep.ADD_SHIFT,
            }
          } as any
        });
        jest.spyOn(userService, 'update').mockImplementation(() => null);

        let result = await onboardingService.onboardingStaffV2(userID, staffPhoto, userLocation, null, paymentLinks);
        expect(result).toMatchObject({
          ...staff,
          avatarID: photoID,
          onboardingStep: OnboardingStep.ADD_SHIFT,
        });
      });
      it('should return Staff with onboardingStep is COMPLETED after add shift', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const photoID: string = uuidv4();
        const now = new Date().toISOString();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_SHIFT,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          postCount: 0,
        };
        const staffPhoto: S3Object = {
          bucket: 'bucket',
          region: 'us-west-2',
          key: 'key',
        };
        const userLocation: UserLocation = {
          name: 'location name',
          location: {
            latitude: 1,
            longitude: 1,
          }
        };
        const shiftInput: ShiftInputRequest = {
          jobID: 'string',
          start: now,
          end: now,
          workplaceID: 'string',
        }
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);
        jest.spyOn(photoService, 'get').mockImplementation(async () => { return {} as Photo });
        jest.spyOn(photoService, 'delete').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);
        jest.spyOn(uuidv4Service, 'uuidv4').mockImplementation(() => photoID);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: photoID,
              onboardingStep: OnboardingStep.COMPLETED,
              completedAt: now,
            }
          } as any
        });
        jest.spyOn(userService, 'update').mockImplementation(() => null);
        jest.spyOn(shiftService, 'create').mockImplementation(() => null);

        let result = await onboardingService.onboardingStaffV2(userID, staffPhoto, userLocation, shiftInput);
        expect(result).toMatchObject({
          ...staff,
          avatarID: photoID,
          onboardingStep: OnboardingStep.COMPLETED,
          completedAt: now,
        });

        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => {
          return {
            Attributes: {
              ...staff,
              avatarID: null,
              onboardingStep: OnboardingStep.COMPLETED,
              completedAt: now,
            }
          } as any
        });
        result = await onboardingService.onboardingStaffV2(userID, staffPhoto, userLocation, shiftInput);
        expect(result).toMatchObject({
          ...staff,
          avatarID: null,
          onboardingStep: OnboardingStep.COMPLETED,
          completedAt: now,
        });
      });
    });
    describe('error', () => {
      it('should throw error if onboarding with user missing basic info', async () => {
        const userID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => false);

        await expect(onboardingService.onboardingStaffV2(userID)).rejects.toThrowError('Please fill the user basic information first.');
      });
      it('should throw error if onboarding with completed staff', async () => {
        const userID: string = uuidv4();
        const photoID: string = uuidv4();
        const user: User = { firstName: 'John', lastName: 'Smith' } as User;
        const now = new Date().toISOString();
        const staff: StaffProfile = {
          id: uuidv4(),
          __typename: 'Profile',
          role: UserRole.STAFF,
          userID,
          onboardingStep: OnboardingStep.ADD_SHIFT,
          sittingWithTotal: 0,
          notificationSettings: {
            muteMessage: false,
            muteSWMRequest: false,
            muteAll: false,
          },
          userConnection: {
            fullName: `${user.firstName} ${user.lastName}`,
          },
          avatarID: photoID,
          completedAt: now,
          postCount: 0,
        };
        jest.spyOn(userService, 'get').mockImplementation(async () => user);
        jest.spyOn(userService, 'basicInforFilled').mockImplementation(() => true);
        jest.spyOn(profileService, 'getStaffByUserID').mockImplementation(async () => staff);

        await expect(onboardingService.onboardingStaffV2(userID)).rejects.toThrowError('This staff already onboarding');
      });
    });
  });

  describe('canCreatePatronFromStaffProfile', () => {
    describe('success', () => {
      it('should return true if can create patron from staff', async () => {
        const oldProfile: Profile = {
          role: UserRole.STAFF,
          onboardingStep: OnboardingStep.ADD_SHIFT,
        } as Profile;
        const newProfile: Profile = {
          role: UserRole.STAFF,
          onboardingStep: OnboardingStep.COMPLETED,
        } as Profile;
        jest.spyOn(profileService, 'getPatronByUserID').mockImplementation(async () => null);

        const result = await onboardingService.canCreatePatronFromStaffProfile(oldProfile, newProfile);
        expect(result).toEqual(true);
      });
      it('should return false if user role is PATRON', async () => {
        const oldProfile: Profile = {
          role: UserRole.STAFF,
          onboardingStep: OnboardingStep.ADD_SHIFT,
        } as Profile;
        const newProfile: Profile = {
          role: UserRole.PATRON,
          onboardingStep: OnboardingStep.COMPLETED,
        } as Profile;
        jest.spyOn(profileService, 'getPatronByUserID').mockImplementation(async () => null);

        const result = await onboardingService.canCreatePatronFromStaffProfile(oldProfile, newProfile);
        expect(result).toEqual(false);
      });
      it('should return false if patron is existed', async () => {
        const oldProfile: Profile = {
          role: UserRole.STAFF,
          onboardingStep: OnboardingStep.ADD_SHIFT,
        } as Profile;
        const newProfile: Profile = {
          role: UserRole.STAFF,
          onboardingStep: OnboardingStep.COMPLETED,
        } as Profile;
        jest.spyOn(profileService, 'getPatronByUserID').mockImplementation(async () => { return {} as PatronProfile });

        const result = await onboardingService.canCreatePatronFromStaffProfile(oldProfile, newProfile);
        expect(result).toEqual(false);
      });
    });
  });

  describe('createPatronFromStaffProfile', () => {
    describe('success', () => {
      it('should return undefined if create patron with staff who does not have avatar', async () => {
        const staffProfile: StaffProfile = {
          avatarID: null
        } as StaffProfile;
        jest.spyOn(userService, 'get').mockImplementation(async () => {return {} as User});
        jest.spyOn(onboardingService, 'onboardingPatron').mockImplementation(async () => null);

        const result = await onboardingService.createPatronFromStaffProfile(staffProfile);
        expect(result).toEqual(undefined);
      });
      it('should return undefined if create patron with staff who have avatar', async () => {
        const staffProfile: StaffProfile = {
          avatarID: uuidv4()
        } as StaffProfile;
        const photo: Photo = {
          id: uuidv4(),
          __typename: 'Photo',
          s3Metadata: {
            bucket: 'bucket',
            region: 'us-west-2',
            key: 'key',
          },
          url: 'https://domain/protected/us-east-2:1c6f6197/avatar/453EEF96FBE.jpeg'
        };
        jest.spyOn(userService, 'get').mockImplementation(async () => { return {} as User });
        jest.spyOn(photoService, 'get').mockImplementation(async () => photo);
        jest.spyOn(s3Service, 'getObject').mockImplementation(async () => {
          return {
            Body: {},
            ContentType: 'string',
          }
        });
        jest.spyOn(s3Service, 'putObject').mockImplementation(async () => null);
        jest.spyOn(onboardingService, 'onboardingPatron').mockImplementation(async () => null);

        const result = await onboardingService.createPatronFromStaffProfile(staffProfile);
        expect(result).toEqual(undefined);
      });
    });
  });
});