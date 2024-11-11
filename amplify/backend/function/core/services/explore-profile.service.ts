import { Shift } from '@swm-core/interfaces/shift.interface';
import { DynamoDBService } from './dynamodb.service';
import { JobService } from './job.service';
import { WorkplaceService } from './workplace.service';
import { ExploreProfile, ExploreProfileDutyRanges, ShiftProfileConnection, UpdateExploreProfileInput } from '@swm-core/interfaces/explore-profile.interface';
import { ProfileService } from './profile.service';
import { UserService } from './user.service';
import { ShiftService } from './shift.service';
import { endOfDate, getNextDate, startOfDate } from '@swm-core/utils/date.util';
import { Job } from '@swm-core/interfaces/job.interface';
import { Profile } from '@swm-core/interfaces/profile.interface';
import { User } from '@swm-core/interfaces/user.interface';
import { isArrayChanged } from '@swm-core/utils/comparison.util';
import { StaffLeaderboard } from '@swm-core/interfaces/staff-leaderboard.interface';
import { LeaderboardService } from './leaderboard.service';

const dynamoDBService = new DynamoDBService();
const workplaceService = new WorkplaceService();
const jobService = new JobService();
const profileService = new ProfileService();
const userService = new UserService();
const shiftService = new ShiftService();
const leaderboardService = new LeaderboardService();

const { API_SITWITHME_EXPLOREPROFILETABLE_NAME } = process.env;

export class ExploreProfileService {

  async create(input: Shift) {
    console.log('Start create exploreProfile', input);
    const { profileID, jobID, workplaceID } = input;

    const [workplace, job, profile, shifts, staffLeaderBoard] = await Promise.all([
      workplaceService.get(workplaceID),
      jobService.get(jobID),
      profileService.get(profileID),
      shiftService.listShiftsByExploreProfile(profileID, workplaceID, jobID),
      leaderboardService.get(profileID),
    ]);

    let user = await userService.get(profile.userID);


    // Get latest shift matched with ExploreProfile to know the date stop working
    const latestShift = this.getLatestShift(shifts);
    const createdAt = new Date().toISOString();

    // Get list duty range
    const now = new Date();
    const rangeEnd = endOfDate(now);
    const rangeStart = startOfDate(getNextDate(now, -1));
    const dutyRanges: ExploreProfileDutyRanges[] = shiftService.getDutyRangesFromShifts(shifts, rangeStart, rangeEnd);
    const blockedProfileIDs = profile.blockedProfileIDs?.values;
    const followingProfileIDs = profile.followingProfileIDs?.values;

    console.log('Start create ExploreProfile: ', API_SITWITHME_EXPLOREPROFILETABLE_NAME,  workplace, job, profile);
    console.log('latestShift', latestShift);
    const exploreProfile: ExploreProfile = {
      __typename: 'ExploreProfile',
      jobID,
      workplaceID,
      profileID,
      yelpBusinessID: workplace.yelpBusinessID,
      workplaceConnection: {
        name: workplace.name,
        yelpBusinessID: workplace.yelpBusinessID,
        location: workplace.location,
        geolocation: {
          lat: workplace.location.latitude,
          lon: workplace.location.longitude,
        },
        categories: workplace.yelpCategories.map(item => item.title),
        yelpCategories: workplace.yelpCategories,
        price: workplace.price,
        fullAddress: workplace.fullAddress,
        rating: workplace.rating,
        imageUrl: workplace.imageUrl,
        reviewCount: workplace.reviewCount
      },
      jobConnection: {
        name: job.name,
      },
      profileConnection: {
        fullName: `${user.firstName} ${user.lastName}`,
        userName: user.userName,
        avatarID: profile.avatarID,
        connectionCount: staffLeaderBoard?.connectionCount || 0,
        postCount: profile.postCount || 0,
        blockedProfileIDs: blockedProfileIDs?.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs) as ShiftProfileConnection['blockedProfileIDs'] : null,
        followingProfileIDs: followingProfileIDs?.length ? dynamoDBService.dbClient.createSet(followingProfileIDs) as Profile['followingProfileIDs'] : null,
        privacy: profile.privacy,
        showInExplore: profile.showInExplore,
      },
      endDate: latestShift?.endDate || null,
      'workplaceID#jobID': `${workplaceID}#${jobID}`,
      createdAt,
      updatedAt: createdAt,
      dutyRanges
    };

    const params = {
      TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
      Item: exploreProfile
    };
    await dynamoDBService.put(params);
  }

  async update(newShift: Shift) {
    const { profileID, jobID, workplaceID } = newShift;
    const [workplace, job, profile, shifts, staffLeaderBoard] = await Promise.all([
      workplaceService.get(workplaceID),
      jobService.get(jobID),
      profileService.get(profileID),
      shiftService.listShiftsByExploreProfile(profileID, workplaceID, jobID),
      leaderboardService.get(profileID),
    ]);
    const user = await userService.get(profile.userID);

    // Get latest shift matched with ExploreProfile to know the date stop working
    const latestShift = this.getLatestShift(shifts);

    // Get list duty range
    const now = new Date();
    const rangeEnd = endOfDate(now);
    const rangeStart = startOfDate(getNextDate(now, -1));
    const dutyRanges: ExploreProfileDutyRanges[] = shiftService.getDutyRangesFromShifts(shifts, rangeStart, rangeEnd);
    const blockedProfileIDs = profile.blockedProfileIDs?.values;
    const followingProfileIDs = profile.followingProfileIDs?.values;

    let exploreProfile: Partial<ExploreProfile> = {
      jobID,
      workplaceID,
      workplaceConnection: {
        name: workplace.name,
        yelpBusinessID: workplace.yelpBusinessID,
        location: workplace.location,
        geolocation: {
          lat: workplace.location.latitude,
          lon: workplace.location.longitude,
        },
        categories: workplace.yelpCategories.map(item => item.title),
        yelpCategories: workplace.yelpCategories,
        price: workplace.price,
        fullAddress: workplace.fullAddress,
        rating: workplace.rating,
        imageUrl: workplace.imageUrl,
        reviewCount: workplace.reviewCount
      },
      jobConnection: {
        name: job.name,
      },
      profileConnection: {
        fullName: `${user.firstName} ${user.lastName}`,
        userName: user.userName,
        avatarID: profile.avatarID,
        connectionCount: staffLeaderBoard?.connectionCount || 0,
        postCount: profile.postCount || 0,
        blockedProfileIDs: blockedProfileIDs?.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs) as ShiftProfileConnection['blockedProfileIDs'] : null,
        followingProfileIDs: followingProfileIDs?.length ? dynamoDBService.dbClient.createSet(followingProfileIDs) as Profile['followingProfileIDs'] : null,
        privacy: profile.privacy,
        deleted: user.deleted,
        showInExplore: profile.showInExplore,
      },
      endDate: latestShift?.endDate || null,
      dutyRanges
    };

    const params = {
      TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
      Key: {
        profileID: newShift.profileID,
        'workplaceID#jobID': [newShift.workplaceID, newShift.jobID].join('#'),
      },
      ...dynamoDBService.buildUpdateExpression({ 'SET': exploreProfile })
    };
    console.log('Update ExploreProfile: ', params);
    await dynamoDBService.update(params);
  }

  /**
   * ExploreProfile will be unique by: profileID, workplaceID, jobID
   */
  async getExistedExploreProfile(profileID: string, workplaceID: string, jobID: string): Promise<ExploreProfile> {
    const params = {
      TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
      KeyConditionExpression: '#profileID = :profileID AND #sortKey =:sortKey',
      ExpressionAttributeNames: {
        '#profileID': 'profileID',
        '#sortKey': 'workplaceID#jobID',
      },
      ExpressionAttributeValues: {
        ':profileID': profileID,
        ':sortKey': [workplaceID, jobID].join('#'),
      }
    };

    console.log('Get existed explore profile', params);

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items[0] as ExploreProfile;
    }
  }

  getLatestShift(shifts: Shift[]): Shift {
    const latestShift = shifts?.length ? shifts.reduce((prevShift, shift) => {
      if (prevShift.endDate === null) { return prevShift }
      if (shift.endDate === null) { return shift }

      return new Date(prevShift.endDate).getTime() > new Date(shift.endDate).getTime() ? prevShift : shift;
    }) : null;
    return latestShift;
  }

  /**
   * If still existed shifts in same workplace and job, after delete a shift:
   * - the exploreProfile endDate must be re-calculated
   * - the list duty event range must be re-calculated
   */
  async delete(deleteKey: {profileID: string, workplaceID: string, jobID: string}): Promise<void> {
    const shifts = await shiftService.listShiftsByExploreProfile(deleteKey.profileID, deleteKey.workplaceID, deleteKey.jobID);
    console.log(`[Remove Explore Profile] has ${shifts?.length} shifts`);
    if (shifts?.length) {
      const latestShift = this.getLatestShift(shifts);

      // Get list duty range
      const now = new Date();
      const rangeEnd = endOfDate(now);
      const rangeStart = startOfDate(getNextDate(now, -1));
      const dutyRanges: ExploreProfileDutyRanges[] = shiftService.getDutyRangesFromShifts(shifts, rangeStart, rangeEnd);

      let exploreProfile: Partial<ExploreProfile> = {
        endDate: latestShift?.endDate,
        dutyRanges
      };

      const params = {
        TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
        Key: {
          profileID: deleteKey.profileID,
          'workplaceID#jobID': [deleteKey.workplaceID, deleteKey.jobID].join('#'),
        },
        ...dynamoDBService.buildUpdateExpression({ 'SET': exploreProfile })
      };
      console.log('Update ExploreProfile: ', params);
      await dynamoDBService.update(params);
      return;
    }

    await dynamoDBService.delete({
      TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
      Key: {
        profileID: deleteKey.profileID,
        'workplaceID#jobID': [deleteKey.workplaceID, deleteKey.jobID].join('#'),
      },
    });
  }

  async updateExploreProfileConnection(connection: {job?: Job, profile?: Profile, user?: User, staffLeaderboard?: StaffLeaderboard}) {
    let exploreProfile: Partial<ExploreProfile> = {};
    const job = connection.job;
    const user = connection.user;
    const profile = connection.profile;
    const staffLeaderboard = connection.staffLeaderboard;
    let queryExpressions = [];

    if (job) {
      exploreProfile.jobConnection = {
        name: job.name
      };
      queryExpressions.push({
        IndexName: 'byJobID',
        KeyConditionExpression: '#jobID = :jobID',
        ExpressionAttributeNames: {
          '#jobID': 'jobID'
        },
        ExpressionAttributeValues: {
          ':jobID': job.id,
        },
      });
    }
    if (profile) {
      console.log('Start update profile to ExploreProfile: ', JSON.stringify(profile, null, 2));
      const blockedProfileIDs = profile.blockedProfileIDs?.values;
      const followingProfileIDs = profile.followingProfileIDs?.values;
      exploreProfile.profileConnection = {
        ...exploreProfile.profileConnection,
        avatarID: profile.avatarID,
        blockedProfileIDs: blockedProfileIDs?.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs) as ShiftProfileConnection['blockedProfileIDs'] : null,
        followingProfileIDs: followingProfileIDs?.length ? dynamoDBService.dbClient.createSet(followingProfileIDs) as Profile['followingProfileIDs'] : null,
        postCount: profile.postCount || 0,
        privacy: profile.privacy,
        showInExplore: profile.showInExplore,
      };
      queryExpressions.push({
        IndexName: 'byProfileID',
        KeyConditionExpression: '#profileID = :profileID',
        ExpressionAttributeNames: {
          '#profileID': 'profileID'
        },
        ExpressionAttributeValues: {
          ':profileID': profile.id,
        },
      });
    }
    if (user) {
      const staff = await profileService.getStaffByUserID(user.id);
      console.log('Staff profile: ', staff);
      exploreProfile.profileConnection = {
        ...exploreProfile.profileConnection,
        fullName: `${user.firstName} ${user.lastName}`,
        userName: user.userName,
        deleted: user.deleted
      };
      queryExpressions.push({
        IndexName: 'byProfileID',
        KeyConditionExpression: '#profileID = :profileID',
        ExpressionAttributeNames: {
          '#profileID': 'profileID'
        },
        ExpressionAttributeValues: {
          ':profileID': staff.id,
        },
      });
    }
    if (staffLeaderboard) {
      exploreProfile.profileConnection = {
        ...exploreProfile.profileConnection,
        connectionCount: staffLeaderboard.connectionCount,
      };
      queryExpressions.push({
        IndexName: 'byProfileID',
        KeyConditionExpression: '#profileID = :profileID',
        ExpressionAttributeNames: {
          '#profileID': 'profileID'
        },
        ExpressionAttributeValues: {
          ':profileID': staffLeaderboard.staffID,
        },
      });
    }

    await Promise.all(queryExpressions.map(async queryExpression => {
      let lastEvalKey;
      do {
        try {
          // Get all explore profiles items
          console.log('Get explore profiles: ', queryExpression);
          const { Items, LastEvaluatedKey } = await dynamoDBService.query({
            TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
            ExclusiveStartKey: lastEvalKey,
            ...queryExpression
          });
          lastEvalKey = LastEvaluatedKey;
          console.log('Explore Profiles Items: ', Items);
          if (!Items.length) {
            break;
          }
          // Put new connection change
          const putItems = Items.map((item: Partial<ExploreProfile>) => {
            return {
              ...item,
              jobConnection: { ...item.jobConnection, ...exploreProfile.jobConnection},
              profileConnection: { ...item.profileConnection, ...exploreProfile.profileConnection }
            }
          });
          console.log(JSON.stringify(putItems, null, 2));

          // Put item with new update connections
          await dynamoDBService.batchPut(API_SITWITHME_EXPLOREPROFILETABLE_NAME, putItems);
        } catch (e) {
          console.log('ERROR: ', e);
        }
      } while (lastEvalKey);
    }));
  }

  async canUpdateExploreProfileConnection(oldUser: User, newUser: User) {
    return (
      oldUser.firstName !== newUser.firstName ||
      oldUser.lastName !== newUser.lastName ||
      oldUser.userName !== newUser.userName
    )
    && !!(await profileService.getStaffByUserID(newUser.id))
  }

  canSyncProfileConnection(oldProfile: Profile, newProfile: Profile) {
    return (
      oldProfile.avatarID !== newProfile.avatarID ||
      oldProfile.postCount !== newProfile.postCount ||
      isArrayChanged(oldProfile.blockedProfileIDs?.values, newProfile.blockedProfileIDs?.values) ||
      isArrayChanged(oldProfile.followingProfileIDs?.values, newProfile.followingProfileIDs?.values) ||
      oldProfile.privacy !== newProfile.privacy ||
      oldProfile.showInExplore !== newProfile.showInExplore
    )
    && newProfile.role === "STAFF"
  }

  async updateExploreProfile(profileID: string, workplaceID: string, jobID: string, input: UpdateExploreProfileInput): Promise<ExploreProfile> {
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
      Key: {
        profileID,
        'workplaceID#jobID': `${workplaceID}#${jobID}`
      },
      ...dynamoDBService.buildUpdateExpression({ 'SET': input }),
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as ExploreProfile;
  }

  async listExploreProfilesByWorkplaceID(workplaceID: string) {
    const params = {
      TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
      IndexName: 'byWorkplaceID',
      KeyConditionExpression: '#workplaceID = :workplaceID',
      ExpressionAttributeNames: {
        '#workplaceID': 'workplaceID'
      },
      ExpressionAttributeValues: {
        ':workplaceID': workplaceID
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as ExploreProfile[];
    }
    return [];
  }
}
