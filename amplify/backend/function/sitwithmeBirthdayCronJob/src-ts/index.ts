/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { Profile } from '@swm-core/interfaces/profile.interface';
import { NotificationService } from '@swm-core/services/notification.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { UserService } from '@swm-core/services/user.service';

const userService = new UserService();
const profileService = new ProfileService();
const notificationService = new NotificationService();

export const handler = async (event) => {
  console.info('Event: ', JSON.stringify(event, null, 2));

  const users = await userService.allUsersByBirthday();
  console.log('All user who have birthday is today: ', users);

  const profiles = (await Promise.all(users.map(async user => await profileService.listProfilesByUserID(user.id)))).flat();
  console.log('All profiles who have birthday is today: ', profiles);

  await Promise.all(profiles.map(async (profile: Profile) => {
    const followingProfileIDs = profile.followingProfileIDs?.values;
    if (followingProfileIDs?.length) {
      await Promise.all(followingProfileIDs.map(async followingProfileID =>
        await notificationService.createBirthdayNotification({ recipientProfileID: followingProfileID, senderProfileID: profile.id })
      ));
    }
  }));
};

