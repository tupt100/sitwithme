/* Amplify Params - DO NOT EDIT
  API_SITWITHME_BLOCKEDPROFILETABLE_ARN
  API_SITWITHME_BLOCKEDPROFILETABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MAILINGTABLE_ARN
  API_SITWITHME_MAILINGTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { ReportProfileType } from '@swm-core/interfaces/reported-profile.interface';
import { Role, User } from '@swm-core/interfaces/user.interface';
import { MailingService } from '@swm-core/services/mailing.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { ReportedProfileService } from '@swm-core/services/reported-profile.service';
import { UserService } from '@swm-core/services/user.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const profileService = new ProfileService();
const userService = new UserService();
const reportedProfileService = new ReportedProfileService();
const mailingService = new MailingService();

const insertRecordHandler = async (record: any) => {
  const { profileID, reportedProfileID, type } = record.new;
  if (type === ReportProfileType.SPAM) {
    await addBlockedProfile(profileID, reportedProfileID);
  }

  // end push subscription to admin
  const admins = await userService.listUsersByRole(Role.ADMIN);
  await sendReportedProfileNotification(profileID, reportedProfileID, admins);

  // send email to admin, ignore handle error
  try {
    const emailContent = await reportedProfileService.buildReportProfileEmail(record.new);
    await Promise.all(admins.map(async (user) => {
      return await mailingService.sendEmail(user.email, emailContent);
    }));
  } catch (e) {
    console.log('ERROR when sending email: ', e);
  }
};

const addBlockedProfile = async (profileID: string, reportedProfileID: string) => {
  const existedBlockedProfile = await profileService.getBlockedProfile(profileID, reportedProfileID);
  if (!existedBlockedProfile) {
    await profileService.addBlockedProfile(profileID, reportedProfileID);
  }
}

const sendReportedProfileNotification = async (profileID: string, reportedProfileID: string, users: User[]) => {
  console.log('Start send subscription profile report to Admin: ', JSON.stringify(users, null, 2));
  await Promise.all(users.map(async (user) => {
    await profileService.notifyReportProfile({
      recipientUserID: user.id,
      profileID,
      reportedProfileID,
    });
  }));
}

export const handler = async (event) => {
  console.info('Event: ', JSON.stringify(event, null, 2));
  const errors = [];

  const records = event.Records.map(record => ({
    eventName: record.eventName,
    new: DynamoDB.Converter.unmarshall(record.dynamodb.NewImage),
    old: DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)
  }));

  console.info('records: ', JSON.stringify(records, null, 2));

  for (const record of records) {
    try {
      switch (record.eventName) {
        case 'INSERT':
          await insertRecordHandler(record);
          break;
        case 'MODIFY':
          break;
        case 'REMOVE':
          break;

        default:
          console.log(`Unexpect record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) {
    throw new Error(`Error: ${JSON.stringify(errors)}`);
  }
};
