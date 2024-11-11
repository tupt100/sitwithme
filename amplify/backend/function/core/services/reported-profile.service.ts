import { buildReportProfileEmail } from '@swm-core/email-templates/report-profile.tpl';
import { ReportedProfile } from '@swm-core/interfaces/reported-profile.interface';
import { DynamoDBService } from './dynamodb.service';
import { ProfileService } from './profile.service';
import { UserService } from './user.service';

const {
  API_SITWITHME_REPORTEDPROFILETABLE_NAME
} = process.env;

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();
const userService = new UserService();

export class ReportedProfileService {
  async buildReportProfileEmail(reportedProfile: ReportedProfile) {
    const reporterProfileDetail = await profileService.get(reportedProfile.profileID);
    const reporter = await userService.get(reporterProfileDetail.userID);
    const reportedProfileDetail = await profileService.get(reportedProfile.reportedProfileID);
    const reported = await userService.get(reportedProfileDetail.userID);

    return buildReportProfileEmail(reporter.email, reported.email, reportedProfile.type, reportedProfile.content?.type, new Date(reportedProfile.createdAt));
  };

  async allReportsByProfileID(profileID: string): Promise<ReportedProfile[]> {
    const result = await dynamoDBService.queryAll({
      TableName: API_SITWITHME_REPORTEDPROFILETABLE_NAME,
      IndexName: 'byProfileIDSortByCreatedAt',
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID',
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    });
    return result as ReportedProfile[];
  }

  async allReportsByReportedProfileID(reportedProfileID: string): Promise<ReportedProfile[]> {
    const result = await dynamoDBService.queryAll({
      TableName: API_SITWITHME_REPORTEDPROFILETABLE_NAME,
      IndexName: 'byReportedProfileIDSortByCreatedAt',
      KeyConditionExpression: '#reportedProfileID = :reportedProfileID',
      ExpressionAttributeNames: {
        '#reportedProfileID': 'reportedProfileID',
      },
      ExpressionAttributeValues: {
        ':reportedProfileID': reportedProfileID
      }
    });
    return result as ReportedProfile[];
  }

  async batchDelete(IDs: string[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_REPORTEDPROFILETABLE_NAME,
      IDs.map(_id => ({ id: _id }))
    );
  }
}