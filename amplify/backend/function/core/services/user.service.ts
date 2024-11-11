/* eslint-disable sonarjs/no-duplicate-string */
import { v4 as uuidv4 } from 'uuid';
import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { CognitoUpdateUserAttributes } from '@swm-core/interfaces/cognito.interface';
import { UpdateProfile } from '@swm-core/interfaces/profile.interface';
import { NotificationSNSMessage, NotificationType } from '@swm-core/interfaces/push-notification.interface';
import { Gender, InitUserInput, Role, UpdateUserInput, User } from '@swm-core/interfaces/user.interface';
import { normalizeString, removeEmptyArray } from '@swm-core/utils/normalization.util';
import isEmail from 'validator/lib/isEmail';
import parsePhoneNumber from 'libphonenumber-js/mobile';
import { CognitoService } from './cognito.service';
import { DynamoDBService } from './dynamodb.service';
import { IotService } from './iot.service';
import { SNSService } from './sns-service';
import { hasAttr } from '@swm-core/utils/validation.util';
import { getMonthAndDayFromDate } from '@swm-core/utils/date.util';

const {
  API_SITWITHME_USERTABLE_NAME,
  PUSH_NOTIFICATION_TOPIC_ARN
} = process.env;

const VALIDATION_FAILED_MSG = 'Validation failed';

const dynamoDBService = new DynamoDBService();
const cognitoService = new CognitoService();
const iotService = new IotService();
const snsService = new SNSService();

export class UserService {

  /**
   * Init user happen when user signup with social account and missed user required fields
   * Update cognito after init user to sync data between cognito and dynamo
   *
   * @param user InitUserInput
   * @param cognito Contains userId, userPoolId and userName, Used to validate user existed in cognito
   * @returns User
   */
  async initUser(user: InitUserInput, cognito: CognitoUpdateUserAttributes): Promise<User> {
    console.log('Get existed User with id: ', cognito.userId);
    const existedUser: User = await this.get(cognito.userId);
    if (!existedUser) {
      throw new BadRequestException('User does not existed');
    }

    user.email = user.email?.toLowerCase().trim();
    user.userName = user.userName?.trim();
    if (hasAttr(user, 'phone') && user.phone !== null) {
      user.phone = user.phone.trim();
    }

    await this.validateInitUserInput(user, existedUser, cognito.userPoolId);

    if (hasAttr(user, 'phone')) {
      user.rawPhone = user.phone !== null ? parsePhoneNumber(user.phone, 'US')?.number as string : null;
    }

    return await this.update(user, cognito);
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async validateInitUserInput(user: InitUserInput, existedUser: User, userPoolId: string) {
    console.log('Start validation user: ', user, existedUser);
    let errors: { [key: string]: string[] } = {
      userName: [],
      email: [],
      firstName: [],
      lastName: [],
      phone: []
    };
    const userEmail = user.email;
    const userName = user.userName;

    if (!userName) {
      errors.userName.push('UserName is required');
    }
    if (!userEmail) {
      errors.email.push('Email is required');
    }
    if (userEmail && !isEmail(userEmail)) {
      errors.email.push('Invalid email format');
    }
    if (!user.firstName) {
      errors.firstName.push('FirstName is required');
    }
    if (!user.lastName) {
      errors.lastName.push('LastName is required');
    }
    if (hasAttr(user, 'phone') && user.phone !== null && !parsePhoneNumber(user.phone, 'US')?.isPossible()) {
      errors.phone.push('Phone is invalid format');
    }

    // Need to verify userName both on cognito and user table.
    // Usernames are case sensitive
    if (userName && userName !== existedUser.userName) {
      console.log('Validate username: ', userName);
      const [existedCognitoUser, existedDBUser] = await Promise.all([
        cognitoService.getUserByUserName(userPoolId, userName),
        this.queryByUserName(userName),
      ]);

      if (existedCognitoUser || existedDBUser.Items[0]) {
        errors.userName.push('Username is already existed');
      }
    }

    if (
      userEmail &&
      isEmail(userEmail) &&
      existedUser.email &&
      userEmail !== existedUser.email
    ) {
      console.log('Validate email: ', userEmail);
      errors.email.push('Email are not allowed to change');
    }

    removeEmptyArray(errors);

    console.log('End validation user: ', errors);
    if (Object.keys(errors).length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async validateUserInput(user: UpdateUserInput, existedUser: UpdateUserInput, userPoolId: string) {
    console.log('Start validation update user: ', user);
    let errors: { [key: string]: string[] } = {
      userName: [],
      email: [],
      firstName: [],
      lastName: [],
      phone: [],
      gender: [],
      userLocation: []
    };
    const userEmail = user.email;
    const userName = user.userName;

    if (
      (user.hasOwnProperty('phone') && typeof user.phone === 'undefined') ||
      (user.phone?.length && !parsePhoneNumber(user.phone, 'US')?.isPossible())
    ) {
      errors.phone.push('Phone is invalid format');
    }
    if (
      (user.hasOwnProperty('gender') && typeof user.gender === 'undefined') ||
      (user.gender?.length && !(user.gender in Gender))
    ) {
      errors.gender.push('Gender is invalid');
    }
    if (
      user.userLocation &&
      !user.userLocation.name
    ) {
      errors.userLocation.push(`Location's name is required`);
    }
    if (
      user.userLocation &&
      (typeof user.userLocation.location?.latitude === 'undefined' ||
      user.userLocation.location?.latitude === null)
    ) {
      errors.userLocation.push(`Location's latitude is required`);
    }
    if (
      user.userLocation &&
      (typeof user.userLocation.location?.longitude === 'undefined' ||
      user.userLocation.location?.longitude === null)
    ) {
      errors.userLocation.push(`Location's longitude is required`);
    }
    if (user.hasOwnProperty('userName') && !userName) {
      errors.userName.push('UserName is required');
    }
    if (user.hasOwnProperty('email') && !userEmail) {
      errors.email.push('Email is required');
    }
    if (userEmail && !isEmail(userEmail)) {
      errors.email.push('Invalid email format');
    }
    if (user.hasOwnProperty('firstName') && !user.firstName) {
      errors.firstName.push('FirstName is required');
    }
    if (user.hasOwnProperty('lastName') && !user.lastName) {
      errors.lastName.push('LastName is required');
    }
    if (userName && userName !== existedUser.userName) {
      console.log('Validate username: ', userName);
      const [existedCognitoUser, existedDBUser] = await Promise.all([
        cognitoService.getUserByUserName(userPoolId, userName),
        this.queryByUserName(userName),
      ]);

      if (existedCognitoUser || existedDBUser.Items[0]) {
        errors.userName.push('Username is already existed');
      }
    }
    if (
      userEmail &&
      isEmail(userEmail) &&
      existedUser.email &&
      userEmail !== existedUser.email
    ) {
      console.log('Validate email: ', userEmail);
      errors.email.push('Email are not allowed to change');
    }

    removeEmptyArray(errors);

    console.log('End validation update user: ', errors);
    if (Object.keys(errors).length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }
  }

  /**
   * Remove undefined values
   * Remove special character from phone number
   */
  normalizeUserInput(profile: UpdateProfile): UpdateUserInput {
    profile = normalizeString(profile);
    const normalizedUser: UpdateUserInput = {
      userName: profile.userName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email?.toLowerCase(),
      userLocation: profile.userLocation,
      birthday: profile.birthday,
      gender: profile.gender,
      phone: profile.phone,
    };

    if (normalizedUser.phone) {
      // normalizedUser.rawPhone = `+${normalizedUser.phone.replace(/\D/g, '')}`
      normalizedUser.rawPhone = (normalizedUser.phone !== null && typeof normalizedUser.phone !== 'undefined') ? parsePhoneNumber(normalizedUser.phone, 'US')?.number as string : null;
    }

    if (normalizedUser.birthday) {
      normalizedUser.birthdayIndex = getMonthAndDayFromDate(normalizedUser.birthday);
    }

    Object.keys(normalizedUser).forEach(key => {
      if (normalizedUser[key] === undefined) {
        delete normalizedUser[key];
      }
    });
    return normalizedUser;
  }

  /**
   *
   * Validate email when sign up, rules: required, email format, unique.
   */
  async validateEmailSignup(email: string, userPoolId: string): Promise<Boolean> {
    const errors = { email: [] };

    // required
    if (!email) {
      errors.email.push('Email is required');
    } else {
      // email format
      if (!isEmail(email)) {
        errors.email.push('Invalid email format');
      } else {
        // unique
        const existedCognitoEmail = await cognitoService.listUsersByEmail(userPoolId, email.trim());
        if (existedCognitoEmail.Users.length) {
          errors.email.push('Email address is already existed');
        }
      }
    }

    if (errors.email.length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }

    return true;
  }

  /**
   *
   * Validate username when sign up, rules: required, unique.
   */
   async validateUsernameSignup(userName: string, userPoolId: string): Promise<Boolean> {
    const errors = { userName: [] };

    // required
    if (!userName) {
      errors.userName.push('Username is required');
    } else {
      // unique
      userName = userName.trim();
      const existedCognitoUser = await cognitoService.getUserByUserName(userPoolId, userName);

      if (existedCognitoUser) {
        errors.userName.push('Username is already existed');
      }
    }

    if (errors.userName.length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }

    return true;
  }

  async validateUniqueEmail(email: string, cognito: CognitoUpdateUserAttributes) {
    const errors = { email: [] };
    errors.email.push('Email are not allowed to change');

    if (errors.email.length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }

    return true;
  }

  async validateUniqueUsername(userName: string, cognito: CognitoUpdateUserAttributes) {
    const errors = { userName: [] };
    const [existedCognitoUser, existedDBUser] = await Promise.all([
      cognitoService.getUserByUserName(cognito.userPoolId, userName),
      this.queryByUserName(userName),
    ]);

    if (
      existedDBUser.Items[0]?.id !== cognito.userId &&
      (existedCognitoUser || existedDBUser.Items[0])
    ) {
      errors.userName.push('Username is already existed');
    }

    if (errors.userName.length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }

    return true;
  }

  /**
   * 1. Update user to dynamoDB
   * 2. Update user to cognito if user changed need sync up to cognito and cognito userPool is provided
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async update(user: UpdateUserInput, cognito: CognitoUpdateUserAttributes): Promise<User> {
    const updateUserParams = {
      TableName: API_SITWITHME_USERTABLE_NAME,
      Key: { id: cognito.userId },
      ReturnValues: 'ALL_NEW',
      ...dynamoDBService.buildUpdateExpression({ 'SET': user }),
    }

    let updatedUser: User;
    try {
      //  1. Update user to dynamo
      console.log('Starting update user to DB: ', user);
      updatedUser = <User>(await dynamoDBService.update(updateUserParams)).Attributes;

      // 2. Update user to cognito if user changed need sync up to cognito and cognito userPool is provided
      if (cognito.userPoolId && cognito.userName) {
        let cognitoUserAttributes = [];
        if (user.userName) {
          cognitoUserAttributes.push({
            Name: 'preferred_username',
            Value: updatedUser.userName,
          });
        }
        if (user.firstName) {
          cognitoUserAttributes.push({
            Name: 'given_name',
            Value: updatedUser.firstName,
          });
        }
        if (user.lastName) {
          cognitoUserAttributes.push({
            Name: 'family_name',
            Value: updatedUser.lastName,
          });
        }
        if (user.email) {
          cognitoUserAttributes.push(
            { Name: 'email', Value: updatedUser.email },
            { Name: 'email_verified', Value: 'true' }
          );
        }

        if (hasAttr(user, 'phone')) {
          const phone = updatedUser.rawPhone || updatedUser.phone || '';
          cognitoUserAttributes.push({ Name: 'phone_number', Value: phone });
          if (phone) {
            cognitoUserAttributes.push({ Name: 'phone_number_verified', Value: 'true' });
          }
        }

        if (cognitoUserAttributes.length) {
          console.log('Starting update user to Cognito: ', cognito);
          await cognitoService.updateUserAttributes(cognitoUserAttributes, cognito)
        }
      }
    } catch (e) {
      console.log('Update user error: ', e);
      throw new PlatformException('Cannot update user. Please try again');
    }

    return updatedUser;
  }

  async get(id: string): Promise<User> {
    return <User>(await dynamoDBService.get({
      TableName: process.env.API_SITWITHME_USERTABLE_NAME,
      Key: { id },
    })).Item;
  }

  async queryByUserName(userName: string) {
    return dynamoDBService.query({
      TableName: process.env.API_SITWITHME_USERTABLE_NAME,
      IndexName: 'byUserName',
      KeyConditionExpression: '#userName = :userName',
      ExpressionAttributeNames: {
        '#userName': 'userName'
      },
      ExpressionAttributeValues: {
        ':userName': userName,
      },
    });
  }

  async listUsersByRole(role: Role): Promise<User[]> {
    const result = await dynamoDBService.query({
      TableName: process.env.API_SITWITHME_USERTABLE_NAME,
      IndexName: 'byRole',
      KeyConditionExpression: '#role = :role',
      ExpressionAttributeNames: {
        '#role': 'role'
      },
      ExpressionAttributeValues: {
        ':role': role,
      },
    });

    if (result && result.Items.length > 0) {
      return result.Items as User[];
    }
    return [];
  }

  async queryByEmail(email: string) {
    return dynamoDBService.query({
      TableName: process.env.API_SITWITHME_USERTABLE_NAME,
      IndexName: 'byEmail',
      KeyConditionExpression: '#email = :email',
      ExpressionAttributeNames: {
        '#email': 'email'
      },
      ExpressionAttributeValues: {
        ':email': email,
      },
    });
  }

  async allUsersByBirthday(): Promise<User[]> {
    const birthday: string = getMonthAndDayFromDate(new Date()); // Month in JS start by 0
    const result = await dynamoDBService.queryAll({
      TableName: API_SITWITHME_USERTABLE_NAME,
      IndexName: 'byBirthdayIndex',
      KeyConditionExpression: '#birthdayIndex = :birthdayIndex',
      ExpressionAttributeNames: {
        '#birthdayIndex': 'birthdayIndex'
      },
      ExpressionAttributeValues: {
        ':birthdayIndex': birthday,
      },
    });
    return result as User[];
  }

  basicInforFilled(user: User): boolean {
    if (user.userName && user.firstName && user.lastName && user.email) {
      return true;
    }
    return false;
  }

  async findCognitoUsernameByEmail(userPoolId: string, email: string): Promise<string> {
    const cognitoUser = await cognitoService.findUserByEmail(userPoolId, email);
    return cognitoUser?.Username;
  }

  /**
   * Disable User in DB and Cognito
   * @param id
   */
  async disableUser(id: string, userPoolId: string) {
    const user = await this.get(id);
    if (user) {
      if (user.disabled) {
        throw new BadRequestException("User already been disabled");
      }

      const disableTasks = [];

      // Mark user disable in DB
      disableTasks.push(dynamoDBService.update({
        TableName: API_SITWITHME_USERTABLE_NAME,
        Key: { id },
        ...dynamoDBService.buildUpdateExpression({ 'SET': { disabled: true } })
      }));

      // Mark user disable on Cognito
      if (user.email) {
        disableTasks.push(cognitoService.adminDisableUser({ UserPoolId: userPoolId, Username: user.email }));
      }

      // notify to user disabled
      try {
        const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.DISABLE_USER, body: user };
        console.log('[disableUser] notify disable', user.id);
        disableTasks.push(snsService.publish({
          Message: JSON.stringify(notificationSNSMessage),
          TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
        }));
      } catch (e) {
        // silent error
        console.log('ERROR when notify disableUser:', e);
      }

      await Promise.all(disableTasks);
    } else {
      throw new BadRequestException("User not found");
    }
  }

  /**
   * Enable User in DB and Cognito
   * @param id
   */
   async enableUser(id: string, userPoolId: string) {
    const user = await this.get(id);
    if (user) {
      if (!user.disabled) {
        throw new BadRequestException("User already been enabled");
      }

      const enableTasks = [];

      // Mark user enable in DB
      enableTasks.push(dynamoDBService.update({
        TableName: API_SITWITHME_USERTABLE_NAME,
        Key: { id },
        ...dynamoDBService.buildUpdateExpression({ 'SET': { disabled: null } })
      }));

      // Mark user enable on Cognito
      if (user.email) {
        enableTasks.push(cognitoService.adminEnableUser({ UserPoolId: userPoolId, Username: user.email }));
      }

      await Promise.all(enableTasks);
    } else {
      throw new BadRequestException("User not found");
    }
  }

  /**
   * Soft delete an User.
   *
   * Mark user a flag as deleted. Also we need to update email and username to random to
   * allow new User registered again.
   *
   * This User can be restored after soft delete if no new User registered (same with email)
   *
   * @param userID: user ID
   */
  async softDeleteUser(userID: string, cognito: CognitoUpdateUserAttributes) {
    const user = await this.get(userID);
    if (user) {
      const bakEmail = user.email;
      const bakUserName = user.userName;

      // update soft delete in DB
      await dynamoDBService.update({
        TableName: API_SITWITHME_USERTABLE_NAME,
        Key: { id: userID },
        ...dynamoDBService.buildUpdateExpression({ 'SET': {
          email: `${uuidv4()}@bak.com`, // hard code for random fake email format
          userName: uuidv4(),
          bakEmail,
          bakUserName,
          deleted: true
        } })
      });


      // delete this user on Cognito
      await cognitoService.adminDeleteUser({
        UserPoolId: cognito.userPoolId,
        Username: bakEmail
      });
    }
  }

  /**
   * Delete permanently an User
   *
   * @param userID user ID
   * @param userPoolID Cognito User Pool ID
   */
  async delete(userID: string, userPoolID: string) {
    const user = await this.get(userID);
    if (user) {
      const email = user.email;

      // delete this User on Cognito
      await cognitoService.adminDeleteUser({
        UserPoolId: userPoolID,
        Username: email
      });

      // delete User in DB
      await dynamoDBService.delete({
        TableName: API_SITWITHME_USERTABLE_NAME,
        Key: { id: userID }
      });
    }
  }

  async batchGet(ids: string[]): Promise<User[]> {
    const rs = await dynamoDBService.batchGet(API_SITWITHME_USERTABLE_NAME, ids.map(id => ({ id })));
    return rs.Responses[API_SITWITHME_USERTABLE_NAME] as User[] || [];
  }

  async attachConnectPolicy(cognitoIdentityID: string, policyName: string): Promise<boolean> {
    await iotService.attachPolicy({
      policyName,
      target: cognitoIdentityID
    });

    return true;
  }

  getFullname(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }
}
