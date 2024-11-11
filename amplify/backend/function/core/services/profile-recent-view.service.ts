import { CreateProfileRecentViewInput, ProfileRecentView } from '@swm-core/interfaces/profile-recent-view.interface';
import { Profile } from '@swm-core/interfaces/profile.interface';
import { ProfileService } from '@swm-core/services/profile.service';
import { DynamoDBService } from './dynamodb.service';

const {
  API_SITWITHME_PROFILERECENTVIEWTABLE_NAME
} = process.env;

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();

export class ProfileRecentViewService {
  async get(profileID: string, profileRecentViewID: string): Promise<ProfileRecentView> {
    return <ProfileRecentView>(await dynamoDBService.get({
      TableName: API_SITWITHME_PROFILERECENTVIEWTABLE_NAME,
      Key: { profileID, profileRecentViewID },
    })).Item;
  }

  async create(input: CreateProfileRecentViewInput): Promise<ProfileRecentView> {
    const createdAt = input.createdAt || new Date().toISOString();
    const profileRecentView: ProfileRecentView = {
      ...input,
      __typename: 'ProfileRecentView',
      createdAt
    };
    await dynamoDBService.put({
      TableName: API_SITWITHME_PROFILERECENTVIEWTABLE_NAME,
      Item: profileRecentView
    });

    return profileRecentView;
  }

  async delete(profileID: string, profileRecentViewID: string) {
    return dynamoDBService.delete({
      TableName: API_SITWITHME_PROFILERECENTVIEWTABLE_NAME,
      Key: { profileID, profileRecentViewID }
    });
  }

  async batchDelete(keys: { profileID: string, profileRecentViewID: string }[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_PROFILERECENTVIEWTABLE_NAME,
      keys.map(k => ({ profileID: k.profileID, profileRecentViewID: k.profileRecentViewID }))
    );
  }

  async allProfileRecentViewsByProfileID(profileID: string): Promise<ProfileRecentView[]> {
    const params = {
      TableName: API_SITWITHME_PROFILERECENTVIEWTABLE_NAME,
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };

    return <ProfileRecentView[]>(await dynamoDBService.queryAll(params));
  }

  async allProfileRecentViewsByProfileRecentViewID(profileRecentViewID: string): Promise<ProfileRecentView[]> {
    const params = {
      TableName: API_SITWITHME_PROFILERECENTVIEWTABLE_NAME,
      IndexName: 'byProfileRecentViewIDSortByCreatedAt',
      KeyConditionExpression: '#profileRecentViewID = :profileRecentViewID',
      ExpressionAttributeNames: {
        '#profileRecentViewID': 'profileRecentViewID'
      },
      ExpressionAttributeValues: {
        ':profileRecentViewID': profileRecentViewID
      }
    };

    return <ProfileRecentView[]>(await dynamoDBService.queryAll(params));
  }

  /**
   * Add a new profile to recent view list.
   * Maxium 5 recent profiles each profile.
   *
   * @param profileID profile ID
   * @param profileRecentViewID other profile ID
   */
  async createProfileRecentView(profileID: string, profileRecentViewID: string): Promise<ProfileRecentView> {
    // 1. Add a new profile to recent view list.
    const recentView = await this.create({
      profileID,
      profileRecentViewID
    });

    // 2. Cut the list to keep maxium 5 items.
    const maxItems = 5;
    const recentViews = await this.allProfileRecentViewsByProfileID(profileID);
    if (recentViews.length > maxItems) {
      // order DESC by createdAt and remove the oldest views
      recentViews.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      const deletedViews = recentViews.slice(maxItems);
      if (deletedViews.length) {
        await this.batchDelete(deletedViews);
      }
    }

    return recentView;
  }

  async listProfileRecentViews(profileID: string): Promise<Profile[]> {
    let recentViews = await this.allProfileRecentViewsByProfileID(profileID);
    // order DESC by createdAt
    recentViews.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const maxItems = 5;
    if (recentViews.length > maxItems) {
      recentViews = recentViews.slice(0, maxItems);
    }
    const rs: Profile[] = [];
    for (const view of recentViews) {
      const profile = await profileService.get(view.profileRecentViewID);
      rs.push(profile);
    }

    return rs;
  }

  /**
   * Delete recent views together for both profiles
   *
   * @param profileID profile ID
   * @param otherProfileID Other Profile ID
   */
  async deleteProfileRecentViewsTogether(profileID: string, otherProfileID: string) {
    const profileRecentViews: ProfileRecentView[] = [];
    let recentView = await this.get(profileID, otherProfileID);
    if (recentView) {
      profileRecentViews.push(recentView);
    }

    recentView = await this.get(otherProfileID, profileID);
    if (recentView) {
      profileRecentViews.push(recentView);
    }

    if (profileRecentViews.length) {
      await this.batchDelete(profileRecentViews);
    }
  }

  async deleteAllRecentViewsByProfileID(profileID: string) {
    // 1. list all recent views
    const recentViews = await this.allProfileRecentViewsByProfileID(profileID);

    // 2. delete all
    await this.batchDelete(recentViews);
  }
}
