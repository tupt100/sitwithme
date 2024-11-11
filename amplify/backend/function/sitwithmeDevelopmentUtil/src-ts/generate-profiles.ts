import { v4 as uuidv4 } from 'uuid';
import * as faker from 'faker';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { OnboardingService } from '@swm-core/services/onboarding.service';
import { WorkplaceService } from '@swm-core/services/workplace.service';
import { Photo } from '@swm-core/interfaces/photo.interface';
import { ProfileService } from '@swm-core/services/profile.service';
import { RepeatFrequency } from '@swm-core/interfaces/repeat.interface';
import { ShiftInputRequest } from '@swm-core/interfaces/shift.interface';
import { UserLocation } from '@swm-core/interfaces/user.interface';

const {
  API_SITWITHME_USERTABLE_NAME,
  API_SITWITHME_JOBTABLE_NAME,
  API_SITWITHME_PHOTOTABLE_NAME
} = process.env;

const dynamoDBService = new DynamoDBService();
const onboardingService = new OnboardingService();
const workplaceService = new WorkplaceService();
const profileService = new ProfileService();

let jobIDs = [];
let yelpBusinesses = {};

const getRandomInt = (max) => {
  return Math.floor(Math.random() * max);
};

const sleep = async (millis) => {
  return new Promise(resolve => setTimeout(resolve, millis));
};

const makeid = (length) => {
  let result           = '';
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() *
charactersLength));
 }
 return result;
}

const fakeAvatar = () => {
  return `https://i.pravatar.cc/500?u=${makeid(16)}`;
};

const fakeInitUserData = () => {
  return {
    __typename: 'User',
    id: uuidv4(),
    role: 'USER',
    createdAt: new Date().toISOString(),
    email: `fake_${faker.internet.email()}`,
    userName: faker.internet.userName(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName()
  };
};

const fakeShiftData = (jobID: string, workplaceID: string): ShiftInputRequest => {
  const now = new Date();
  const start = new Date(now.getTime());
  start.setHours(start.getHours() + getRandomInt(10));

  const end = new Date(start.getTime());
  end.setHours(end.getHours() + 1 + getRandomInt(7));
  return {
    jobID,
    start: start.toISOString(),
    end: end.toISOString(),
    repeat: {
      frequency: RepeatFrequency.DAILY,
      every: 1
    },
    workplaceID
  };
};

export const generateStaffProfiles = async (num: number, lat: number, lon: number) => {
  console.log('begin generateStaffProfiles');

  for (let i = 0; i < num; i++) {
    // 1. Generate User
    const userData = fakeInitUserData();
    try {
      await dynamoDBService.put({
        TableName: API_SITWITHME_USERTABLE_NAME,
        Item: userData,
      });

      // 2. Generate Staff Profile and default shift
      const staff = await onboardingService.onboardingStaff(userData.id);

      // 2.1 Fetch Jobs
      if (!jobIDs.length) {
        const { Items } = await dynamoDBService.scan({
          TableName: API_SITWITHME_JOBTABLE_NAME
        });
        jobIDs = Items.map((item) => item.id);
      }
      const jobID = jobIDs[getRandomInt(jobIDs.length)];

      // 2.2 Create workplace
      if (!yelpBusinesses[`${lat},${lon}`]) {
        const { items } = await workplaceService.searchYelpBusiness({
          location: {
            latitude: lat,
            longitude: lon
          },
          keyword: ''
        }, 50);
        yelpBusinesses[`${lat},${lon}`] = items;
      }
      const business = yelpBusinesses[`${lat},${lon}`][getRandomInt(yelpBusinesses[`${lat},${lon}`].length)];
      const workplace = await workplaceService.create({
        name: business.name,
        yelpBusinessID: business.id,
        location: business.location,
        fullAddress: business.fullAddress,
        profileID: staff.id
      });
      const userLocation: UserLocation = {
        location: {
          latitude: lat,
          longitude: lon,
        },
        name: business.fullAddress,
      };

      console.log('Generate profiles: ', staff.id, jobID, workplace.id);

      await onboardingService.onboardingStaff(userData.id, null, userLocation, fakeShiftData(jobID, workplace.id));

      // 3. Add Staff avatar
      const photo: Photo = {
        id: uuidv4(),
        __typename: 'Photo',
        s3Metadata: { bucket: 'fake', region: 'fake', key: 'fake' },
        url: fakeAvatar(),
        createdAt: new Date().toISOString()
      };
      await dynamoDBService.put({
        TableName: API_SITWITHME_PHOTOTABLE_NAME,
        Item: photo
      });
      await profileService.update(staff.id, {
        avatarID: photo.id
      });

      console.log("SUCCESS");

      await sleep(500);
    } catch (e) {
      console.log("ERROR: ", e);
    }
  }
};