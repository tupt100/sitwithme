import { MemberShip, UpdateProfile } from '@swm-core/interfaces/profile.interface';
import { Gender, InitUserInput, Role, UpdateUserInput, User } from '@swm-core/interfaces/user.interface';
import { CognitoService } from './cognito.service';
import { UserService } from './user.service';
import { v4 as uuidv4 } from 'uuid';

const userService = new UserService();
const cognitoService = CognitoService.prototype;

describe('UserService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('validateInitUserInput', () => {
    it('should return undefined if init user input has no error', async () => {
      const user: InitUserInput = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'abc@gmail.com',
        userName: 'johnsmith',
        phone: '2025550194',
        rawPhone: '202-555-0194',
      };
      const existedUser: User = {
        id: uuidv4(),
        role: Role.USER,
        userName: 'johnsmith',
        email: 'abc@gmail.com',
      };
      jest.spyOn(cognitoService, 'getUserByUserName').mockImplementation(async () => null);
      jest.spyOn(userService, 'queryByUserName').mockImplementation(async () => { return { Items: [] } as any });

      await expect(userService.validateInitUserInput(user, existedUser, '')).resolves.toEqual(undefined);
    });
    it('should throw error if init user input has errors', async () => {
      const user: InitUserInput = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'abc@gmail.com',
        userName: 'johnsmith',
        phone: '2025550194',
        rawPhone: '202-555-0194',
      };
      const existedUser: User = {
        id: uuidv4(),
        role: Role.USER,
        userName: 'johnsmith01',
        email: 'abc01@gmail.com',
      };
      jest.spyOn(cognitoService, 'getUserByUserName').mockImplementation(async () => null);
      jest.spyOn(userService, 'queryByUserName').mockImplementation(async () => { return { Items: [] } as any });

      await expect(userService.validateInitUserInput(user, existedUser, '')).rejects.toThrowError('Validation failed');
    });
  });
  describe('validateUserInput', () => {
    it('should return undefined if user input has no error', async () => {
      const user: UpdateUserInput = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'abc@gmail.com',
        userName: 'johnsmith',
        phone: '+36 55 516 240',
        gender: Gender.FEMALE,
        userLocation: {
          name: 'Unknown',
          location: {
            latitude: 0,
            longitude: 0
          }
        }
      };
      const existedUser: User = {
        id: uuidv4(),
        role: Role.USER,
        userName: 'johnsmith',
        email: 'abc@gmail.com',
      };
      jest.spyOn(cognitoService, 'getUserByUserName').mockImplementation(async () => null);
      jest.spyOn(userService, 'queryByUserName').mockImplementation(async () => { return { Items: [] } as any });

      await expect(userService.validateUserInput(user, existedUser, '')).resolves.toEqual(undefined);
    });

    it('should return undefined if user input has no error', async () => {
      const user: UpdateUserInput = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'abc01@gmail.com',
        userName: 'johnsmith01',
        phone: '2025550194',
        gender: Gender.FEMALE,
        userLocation: {
          name: 'Unknown',
          location: {
            latitude: 0,
            longitude: 0
          }
        }
      };
      const existedUser: User = {
        id: uuidv4(),
        role: Role.USER,
        userName: 'johnsmith',
        email: 'abc@gmail.com',
      };
      jest.spyOn(cognitoService, 'getUserByUserName').mockImplementation(async () => null);
      jest.spyOn(userService, 'queryByUserName').mockImplementation(async () => { return { Items: [] } as any });

      await expect(userService.validateUserInput(user, existedUser, '')).rejects.toThrowError('Validation failed');
    });
  });
  describe('normalizeUserInput', () => {
    it('should return normalized user input', () => {
      const profile: UpdateProfile = {
        id: uuidv4(),
        userName: 'johnsmith',
        firstName: 'John',
        lastName: 'De',
        email: 'abc@gmail.com',
        bio: '',
        avatar: null,
        birthday: '2009-01-01',
        gender: Gender.FEMALE,
        phone: '+36 55 999 284',
        userLocation: undefined,
        privacy: true,
        memberShip: MemberShip.PREMIUM,
        paypalLink: '',
        venmoLink: undefined,
        showInExplore: true,
      };
      expect(userService.normalizeUserInput(profile)).toStrictEqual({
        userName: 'johnsmith',
        firstName: 'John',
        lastName: 'De',
        email: 'abc@gmail.com',
        birthday: '2009-01-01',
        gender: Gender.FEMALE,
        phone: '+36 55 999 284',
        rawPhone: '+3655999284',
        birthdayIndex: '1-1',
      })
    });
  });
  describe('basicInforFilled', () => {
    it('should return true if basic info filled', () => {
      expect(userService.basicInforFilled({
        id: uuidv4(),
        role: Role.USER,
        userName: 'johnsmith',
        firstName: 'John',
        lastName: 'De',
        email: 'abc@gmail.com',
      })).toEqual(true);
    });
  });
});