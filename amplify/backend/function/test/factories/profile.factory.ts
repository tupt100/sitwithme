import { MemberShip, OnboardingStep, PresenceStatus, Profile, UserRole } from '@swm-core/interfaces/profile.interface';
import { v4 as uuidv4 } from 'uuid';

export const generateProfiles = (number: number = 1, profile: Partial<Profile>) => {
  const profiles: Profile[] = [];
  while (number--) {
    const profileItem = generateProfile(profile, number);
    profiles.push(profileItem);
  };
  return profiles;
}

export const generateProfile = (profile?: Partial<Profile>, suffix: number = 0) => {
  const now = new Date();
  return {
    id: uuidv4(),
    __typename: 'Profile',
    bio: 'string',
    userID: uuidv4(),
    avatarID: uuidv4(),
    completedAt: now.toISOString(),
    role: UserRole.PATRON,
    onboardingStep: OnboardingStep.COMPLETED,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    profileRecentView: {
      wrapperName: 'string',
      values: [uuidv4()],
      type: 'string',
    },
    exploreRecentSearch: [`recent search ${suffix}`],
    presenceStatus: PresenceStatus.ON,
    lastOnlineAt: now.toISOString(),
    sittingWithTotal: 0,
    postCount: 0,
    notificationSettings: {
      muteMessage: true,
      muteSWMRequest: true,
      muteAll: false,
    },
    blockedProfileIDs: {
      wrapperName: 'string',
      values: [uuidv4()],
      type: 'string',
    },
    privacy: true,
    memberShip: MemberShip.NONE,
    userConnection: {
      fullName: `fullName ${suffix}`,
      userLocation: {
        name: `address ${suffix}`,
        location: {
          latitude: 0,
          longitude: 0,
        }
      }
    },
    ...profile
  }
}