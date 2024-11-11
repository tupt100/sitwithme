import { DynamoDBService } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { BlockedProfile, BlockProfileNotificationInput, ChangePrivacyNotificationInput, MemberShip, OnboardingStep, PatronProfile, PaymentLinks, Profile, ProfileUserConnection, ReportProfileNotificationInput, StaffProfile, UpdateProfile, UpdateProfileInput, UserRole } from '@swm-core/interfaces/profile.interface';
import { PhotoService } from './photo.service';
import { CognitoUpdateUserAttributes } from '@swm-core/interfaces/cognito.interface';
import { UpdateUserInput, User } from '@swm-core/interfaces/user.interface';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { UserService } from './user.service';
import { Photo } from '@swm-core/interfaces/photo.interface';
import { normalizeString, removeUndefined } from '@swm-core/utils/normalization.util';
import { NotificationSNSMessage, NotificationType } from '@swm-core/interfaces/push-notification.interface';
import { SNSService } from './sns-service';
import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { RegexConst } from '@swm-core/constants/regex.const';

const dynamoDBService = new DynamoDBService();
const photoService = new PhotoService();
const userService = new UserService();
const snsService = new SNSService();

const {
  API_SITWITHME_PROFILETABLE_NAME,
  PUSH_NOTIFICATION_TOPIC_ARN,
  API_SITWITHME_BLOCKEDPROFILETABLE_NAME
} = process.env;

export class ProfileService {

  async createPatron(userID: string): Promise<PatronProfile> {
    const now = new Date().toISOString();
    let user = await userService.get(userID);
    const patron: PatronProfile = {
      id: uuidv4(),
      __typename: 'Profile',
      role: UserRole.PATRON,
      userID,
      onboardingStep: OnboardingStep.ADD_PHOTO,
      sittingWithTotal: 0,
      postCount: 0,
      notificationSettings: {
        muteMessage: false,
        muteSWMRequest: false,
        muteAll: false,
      },
      memberShip: MemberShip.NONE,
      userConnection: {
        fullName: `${user.firstName} ${user.lastName}`,
      },
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      Item: patron
    };
    await dynamoDBService.put(params);
    return patron;
  }

  async createStaff(userID: string): Promise<StaffProfile> {
    const now = new Date().toISOString();
    let user = await userService.get(userID);
    const staff: StaffProfile = {
      id: uuidv4(),
      __typename: 'Profile',
      role: UserRole.STAFF,
      userID,
      onboardingStep: OnboardingStep.ADD_PHOTO,
      sittingWithTotal: 0,
      postCount: 0,
      notificationSettings: {
        muteMessage: false,
        muteSWMRequest: false,
        muteAll: false,
      },
      userConnection: {
        fullName: `${user.firstName} ${user.lastName}`,
      },
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      Item: staff
    };
    await dynamoDBService.put(params);
    return staff;
  }

  async addBlockedProfiles(profileID: string, blockedProfileID: string) {
    try {
      const existedProfile: Profile = await this.get(profileID);
      console.log('Start add profileID to blockedProfileIDs: ', JSON.stringify(existedProfile, null, 2));
      const blockedProfileIDs = existedProfile?.blockedProfileIDs?.values || [];
      console.log('Start add profileID to blockedProfileIDs: ', profileID, JSON.stringify(existedProfile, null, 2));
      if (existedProfile) {
        if (blockedProfileID && !blockedProfileIDs.find(i => i === blockedProfileID)) {
          blockedProfileIDs.push(blockedProfileID);
        }
        console.log('Start create set blockedProfileIDs: ', blockedProfileIDs );
        await this.update(profileID, { blockedProfileIDs: blockedProfileIDs.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs) : null });
      }
    } catch (e) {
      console.log("ERROR - addBlockedProfiles: ", JSON.stringify(e, null, 2));
      throw new Error(e);
    }
  }

  async removeBlockedProfiles(profileID: string, blockedProfileID: string) {
    try {
      const existedProfile: Profile = await this.get(profileID);
      console.log('Start remove profileID to blockedProfileIDs: ', JSON.stringify(existedProfile, null, 2));

      if (existedProfile) {
        const blockedProfileIDs = existedProfile.blockedProfileIDs?.values?.filter(i => i !== blockedProfileID) || [];
        console.log('Start create set blockedProfileIDs: ', blockedProfileIDs);
        await this.update(profileID, { blockedProfileIDs: blockedProfileIDs.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs) : null });
      }
    } catch (e) {
      console.log("ERROR - removeBlockedProfiles: ", JSON.stringify(e, null, 2));
      throw new Error(e);
    }
  }

  async update(id: string, params): Promise<StaffProfile | PatronProfile> {
    console.log('Start update profile item: ', id, JSON.stringify(params, null, 2));
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': params }),
      ReturnValues: "ALL_NEW",
    });
    if (result.Attributes?.role === UserRole.PATRON) {
      return result.Attributes as PatronProfile;
    } else if (result.Attributes?.role === UserRole.STAFF) {
      return result.Attributes as StaffProfile;
    }
  }

  // Find Patron Profile by user ID.
  // Return undefined if not found.
  async getPatronByUserID(userID: string): Promise<PatronProfile> {
    return this.getProfileByUserID(userID, UserRole.PATRON);
  }

  // Find Staff Profile by user ID.
  // Return undefined if not found.
  async getStaffByUserID(userID: string): Promise<StaffProfile> {
    return this.getProfileByUserID(userID, UserRole.STAFF);
  }

  async listProfilesByUserID(userID: string): Promise<Profile[]> {
    const params = {
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      IndexName: 'byUser',
      // eslint-disable-next-line sonarjs/no-duplicate-string
      KeyConditionExpression: '#userID = :userID',
      ExpressionAttributeNames: {
        '#userID': 'userID'
      },
      ExpressionAttributeValues: {
        ':userID': userID
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as Profile[];
    }
    return [];
  }

  async getProfileByUserID(userID: string, role: UserRole): Promise<StaffProfile | PatronProfile> {
    const params = {
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      IndexName: 'byUser',
      KeyConditionExpression: '#userID = :userID',
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: {
        '#userID': 'userID',
        '#role': 'role'
      },
      ExpressionAttributeValues: {
        ':userID': userID,
        ':role': role
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      if (role === UserRole.PATRON) {
        return result.Items[0] as PatronProfile;
      } else if (role === UserRole.STAFF) {
        return result.Items[0] as StaffProfile;
      }
    }
  }

  async updateProfile(profile: UpdateProfile, cognito: CognitoUpdateUserAttributes): Promise<User> {
    const profileId: string = profile.id;
    const existedProfile: Profile = await this.get(profileId);
    if (!profileId || existedProfile?.userID !== cognito.userId) {
      throw new BadRequestException(`Invalid profile's id`);
    }
    const existedUserByProfile: User = await userService.get(existedProfile.userID);
    if (!existedUserByProfile) {
      throw new BadRequestException(`User is not existed`);
    }

    console.log('Existed profile: ', existedProfile);
    const userId: string = cognito.userId;
    const userInfo: UpdateUserInput = userService.normalizeUserInput(profile);
    const existedUserInfo: UpdateUserInput = {
      userName: existedUserByProfile?.userName,
      email: existedUserByProfile?.email,
    };

    const profileInfo: UpdateProfileInput = this.normalizeProfileInput(profile);
    const existedProfileInfo: UpdateProfileInput = {
      avatarID: existedProfile.avatarID,
    };

    await this.validateProfile(profileInfo, userInfo, existedUserInfo, cognito.userPoolId);

    // Only update user if any change
    if (Object.keys(userInfo).length) {
      console.log('Start update userInfo: ', userInfo);
      await userService.update(userInfo, cognito);
    }

    // If user submit avatar, then remove old avatar and create a new Avatar for Profile.
    if (profileInfo.avatar || profileInfo.avatar === null) {
      let photo: Photo;
      if (existedProfileInfo.avatarID) {
        photo = await photoService.get(existedProfileInfo.avatarID);
        if (photo) {
          await photoService.delete(photo.id);
        }
      }
      if (profileInfo.avatar) {
        photo = await photoService.create(profileInfo.avatar);
      }
      profileInfo.avatarID = photo?.id || null;
      delete profileInfo.avatar;
    }

    // Only update profile if any change
    if (Object.keys(profileInfo).length) {
      console.log('Start update profileInfo: ', profileInfo);
      await this.update(profileId, profileInfo);
    }

    console.log('Finished update profile. Getting user: ', userId);
    return await userService.get(userId);
  }

  async validateProfile(
    profileInfo: UpdateProfileInput,
    userInfo: UpdateUserInput,
    existedUserInfo: UpdateUserInput,
    userPoolId: string,
  ) {
    const paymentLinks = removeUndefined({ paypal: profileInfo.paypalLink, venmo: profileInfo.venmoLink });
    this.validatePaymentLinks(paymentLinks);
    await userService.validateUserInput(userInfo, existedUserInfo, userPoolId);
  }

  /**
   * Mark Staff recent view for Patron
   *
   * 1. Get current Patron, if not, then throw error
   * 2. Make sure staffID is valid
   * 3. Mark Staff recent view
   */
  async createStaffRecentView(userID: string, staffID: string) {
    // 1. Get current Patron, if not, then throw error
    const patron = await this.getPatronByUserID(userID);
    if (!patron) {
      throw new BadRequestException('You are not the Patron. Please switch seat or create new account.');
    }

    // 2. Make sure staffID is valid
    const staff = await this.get(staffID);
    if (staff?.role === UserRole.STAFF) {
      // 3. Mark Staff recent view
      const now = new Date();
      const oldRecentViews = patron.staffRecentView;
      let recentViews = oldRecentViews?.values?.filter((v) => {
        const _staffID = v.split('#')[0];
        return _staffID !== staffID
      }) || [];
      recentViews.unshift(`${staffID}#${now.toISOString()}`);
      recentViews.sort((a, b) => {
        const _dateA = a.split('#')[1];
        const _dateB = b.split('#')[1];
        return new Date(_dateB).getTime() - new Date(_dateA).getTime();
      });

      const maxRecent = 5;
      if (recentViews.length > maxRecent) {
        recentViews = recentViews.slice(0, maxRecent);
      }

      const params = { staffRecentView: dynamoDBService.dbClient.createSet(recentViews) };
      await this.update(patron.id, params);
    } else {
      throw new BadRequestException('Staff not found');
    }
  }

  /**
   * 1. Put new keyword to start of exploreRecentSearch
   * 2. Maximum recent search is 10
   */
  async createExploreRecentSearch(userID: string, keyword: string) {
    // 1. Get current Patron, if not, then throw error
    const patron: Profile = await this.getPatronByUserID(userID);
    if (!patron) {
      throw new BadRequestException('Patron not found.');
    }
    // If keyword is empty, do nothing
    if (!keyword) {
      return;
    }

    let keywords = patron.exploreRecentSearch || [];
    // Remove existed keyword if any
    if (keywords.length) {
      keywords = keywords.filter(item => item !== keyword);
    }

    // 1. Put new keyword to start of exploreRecentSearch
    keywords.unshift(keyword);

    // 2. Maximum recent search is 10
    const maxRecent = 10
    if (keywords.length > maxRecent) {
      keywords.length = maxRecent;
    }

    const params = { exploreRecentSearch: keywords };
    await this.update(patron.id, params);
  }

  /**
   * 1. Put new keyword to start of exploreRecentSearch
   * 2. Maximum recent search is 10
   */
  async createExploreRecentSearchV2(userID: string, role: UserRole, keyword: string) {
    const profile: Profile = await this.getProfileByUserID(userID, role);
    if (!profile) {
      throw new BadRequestException('Profile not found.');
    }
    // If keyword is empty, do nothing
    if (!keyword) {
      return;
    }

    let keywords = profile.exploreRecentSearch || [];
    // Remove existed keyword if any
    if (keywords.length) {
      keywords = keywords.filter(item => item !== keyword);
    }

    // 1. Put new keyword to start of exploreRecentSearch
    keywords.unshift(keyword);

    // 2. Maximum recent search is 10
    const maxRecent = 10
    if (keywords.length > maxRecent) {
      keywords.length = maxRecent;
    }

    const params = { exploreRecentSearch: keywords };
    await this.update(profile.id, params);
  }

  /**
   * List staff recent views
   *
   * 1. Get current Patron, if not, then throw error
   * 2. Return Staff order by view date
   */
  async listStaffRecentViews(userID: string): Promise<Profile[]> {
    // 1. Get current Patron, if not, then throw error
    const patron = await this.getPatronByUserID(userID);
    if (!patron) {
      throw new BadRequestException('You are not the Patron. Please switch seat or create new account.');
    }

    // 2. Return Staff order by view date
    const recentViews = patron.staffRecentView?.values;
    if (recentViews) {
      // eslint-disable-next-line sonarjs/no-identical-functions
      recentViews.sort((a, b) => {
        const _dateA = a.split('#')[1];
        const _dateB = b.split('#')[1];
        return new Date(_dateB).getTime() - new Date(_dateA).getTime();
      });

      const rs: Profile[] = [];
      for (const view of recentViews) {
        const staffID = view.split('#')[0];
        const staff = await this.get(staffID);
        if (staff?.role === UserRole.STAFF) {
          rs.push(staff);
        }
      }

      return rs;
    } else {
      return [];
    }
  }

  normalizeProfileInput(profile: UpdateProfile): UpdateProfileInput {
    profile = normalizeString(profile);
    const normalizedProfile: UpdateProfileInput = {
      bio: profile.bio,
      avatar: profile.avatar,
      privacy: profile.privacy,
      paypalLink: profile.paypalLink,
      venmoLink: profile.venmoLink,
      showInExplore: profile.showInExplore,
    };

    removeUndefined(normalizedProfile);
    return normalizedProfile;
  }

  async get(id: string): Promise<Profile> {
    return <Profile>(await dynamoDBService.get({
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      Key: { id },
    })).Item;
  }

  async delete(id: string) {
    return dynamoDBService.delete({
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      Key: { id },
    });
  }

  async batchGet(ids: string[]): Promise<Profile[]> {
    const rs = await dynamoDBService.batchGet(API_SITWITHME_PROFILETABLE_NAME, ids.map(id => ({ id })));
    return rs.Responses[API_SITWITHME_PROFILETABLE_NAME] as Profile[] || [];
  }

  async batchDeleteBlockedProfiles(keys: any[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_BLOCKEDPROFILETABLE_NAME,
      keys.map(key => ({ profileID: key.profileID, blockedProfileID: key.blockedProfileID }))
    );
  }

  async updateSittingWithTotal(id: string, inc: number) {
    return dynamoDBService.update({
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'ADD': { sittingWithTotal: inc } })
    });
  }

  async updatePostCount(id: string, inc: number) {
    await dynamoDBService.update({
      TableName: API_SITWITHME_PROFILETABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'ADD': { postCount: inc } })
    });
  }

  async addBlockedProfile(profileID: string, blockedProfileID: string) {
    const now = new Date().toISOString();

    const blockedProfile = {
      __typename: 'BlockedProfile',
      profileID: profileID,
      blockedProfileID: blockedProfileID,
      createdAt: now,
      updatedAt: now,
    };

    const params = {
      TableName: API_SITWITHME_BLOCKEDPROFILETABLE_NAME,
      Item: blockedProfile
    };
    await dynamoDBService.put(params);
    return blockedProfile;
  }

  async getBlockedProfile(profileID: string, blockedProfileID: string): Promise<BlockedProfile> {
    return <BlockedProfile>(await dynamoDBService.get({
      TableName: API_SITWITHME_BLOCKEDPROFILETABLE_NAME,
      Key: { profileID, blockedProfileID },
    })).Item;
  }

  async allBlockedProfiles(profileID: string): Promise<BlockedProfile[]> {
    const params = {
      TableName: API_SITWITHME_BLOCKEDPROFILETABLE_NAME,
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };
    const result = await dynamoDBService.queryAll(params);
    if (result && result.length > 0) {
      return result as BlockedProfile[];
    }
    return [];
  }

  async allBlockedProfilesByBlockedProfileID(blockedProfileID: string): Promise<BlockedProfile[]> {
    const params = {
      TableName: API_SITWITHME_BLOCKEDPROFILETABLE_NAME,
      IndexName: 'byBlockedProfileIDSortByCreatedAt',
      KeyConditionExpression: '#blockedProfileID = :blockedProfileID',
      ExpressionAttributeNames: {
        '#blockedProfileID': 'blockedProfileID'
      },
      ExpressionAttributeValues: {
        ':blockedProfileID': blockedProfileID
      }
    };
    const result = await dynamoDBService.queryAll(params);
    if (result && result.length > 0) {
      return result as BlockedProfile[];
    }
    return [];
  }

  async updateUserConnection(user: User) {
    let queryExpression: { [key: string]: any } = {
      IndexName: 'byUser',
      KeyConditionExpression: '#userID = :userID',
      ExpressionAttributeNames: {
        '#userID': 'userID'
      },
      ExpressionAttributeValues: {
        ':userID': user.id,
      },
    };
    let lastEvalKey;

    do {
      try {
        // Get all profiles items
        const { Items, LastEvaluatedKey } = await dynamoDBService.query({
          TableName: API_SITWITHME_PROFILETABLE_NAME,
          ExclusiveStartKey: lastEvalKey,
          ...queryExpression
        });
        lastEvalKey = LastEvaluatedKey;
        console.log('Profiles Items: ', Items);
        if (!Items.length) {
          break;
        }
        // Put new connection change
        const putItems = Items.map((item: Partial<Profile>) => {
          return {
            ...item,
            userConnection: {
              fullName: `${user.firstName} ${user.lastName}`,
              userLocation: user.userLocation ? {
                ...user.userLocation,
                geolocation: {
                  lat: user.userLocation.location.latitude,
                  lon: user.userLocation.location.longitude,
                },
              } : null,
              deleted: user.deleted,
              userName: user.userName
            }
          }
        });
        console.log(JSON.stringify(putItems, null, 2));

        // Put item with new update connections
        await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, putItems);
      } catch (e) {
        console.log('ERROR: ', e);
      }
    } while (lastEvalKey);
  }

  async notifyBlockProfile(blockProfileNotificationInput: BlockProfileNotificationInput) {
    try {
      const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.BLOCK_PROFILE, body: blockProfileNotificationInput };
      console.log('Push notifyBlockProfile:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
      console.log('Pushed notifyBlockProfile:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
    } catch (e) {
      console.log('ERROR when notifyBlockProfile - push notification: ', e);
    }
  }

  async notifyReportProfile(reportProfileNotificationInput: ReportProfileNotificationInput) {
    try {
      const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.REPORT_PROFILE, body: reportProfileNotificationInput };
      console.log('Push notifyReportProfile:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
      console.log('Pushed notifyReportProfile:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
    } catch (e) {
      console.log('ERROR when notifyReportProfile - push notification: ', e);
    }
  }

  async notifyChangePrivacy(changePrivacyNotificationInput: ChangePrivacyNotificationInput) {
    try {
      const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.CHANGE_PRIVACY, body: changePrivacyNotificationInput };
      console.log('Push notifyChangePrivacy:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
      console.log('Pushed notifyChangePrivacy:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
    } catch (e) {
      console.log('ERROR when notifyChangePrivacy - push notification: ', e);
    }
  }

  validatePaymentLinks(paymentLinks: PaymentLinks) {
    let errors: { [key: string]: string[] } = {
      venmo: [],
      paypal: [],
    };

    if (
      (paymentLinks.hasOwnProperty('venmo') && typeof paymentLinks.venmo === 'undefined') ||
      (paymentLinks.venmo?.length && !RegexConst.venmo.test(paymentLinks.venmo))
    ) {
      errors.venmo.push('Venmo link is invalid format');
    }

    if (
      (paymentLinks.hasOwnProperty('paypal') && typeof paymentLinks.paypal === 'undefined') ||
      (paymentLinks.paypal?.length && !RegexConst.paypal.test(paymentLinks.paypal))
    ) {
      errors.paypal.push('Paypal link is invalid format');
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key].length) {
        delete errors[key];
      }
    });

    if (Object.keys(errors).length) {
      throw new BadRequestException('Validation failed', ErrorCodeConst.Validation, errors);
    }
  }
}
