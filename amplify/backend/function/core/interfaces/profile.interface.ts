import { S3Object } from './file.interface';
import { Gender, User, UserLocation } from './user.interface';

export enum MemberShip {
  NONE = 'NONE',
  PREMIUM = 'PREMIUM'
}

export interface Profile {
  id: string;
  __typename: string;
  bio?: string;
  userID: string;
  avatarID?: string;
  completedAt?: string;
  role: string;
  onboardingStep?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: User;
  staffRecentView?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
  profileRecentView?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
  exploreRecentSearch?: string[];
  presenceStatus?: PresenceStatus;
  lastOnlineAt?: string;
  sittingWithTotal: number;
  postCount: number;
  notificationSettings?: NotificationSettings;
  blockedProfileIDs?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
  privacy?: boolean;
  memberShip?: MemberShip;
  userConnection: ProfileUserConnection;
  followingProfileIDs?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
  paypalLink?: string;
  venmoLink?: string;
  showInExplore?: boolean;
}

export interface PatronProfile extends Profile {}

export interface StaffProfile extends Profile {
  duty?: boolean;
}

// Include both profile and user information
export interface UpdateProfile {
  id: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  avatar?: S3Object;
  birthday?: string;
  gender?: Gender;
  phone?: string;
  rawPhone?: string;
  userLocation?: UserLocation;
  privacy?: boolean;
  memberShip?: MemberShip;
  paypalLink?: string;
  venmoLink?: string;
  showInExplore?: boolean;
}

// Input profile to save to ProfileTable
export interface UpdateProfileInput {
  bio?: string;
  avatarID?: string;
  avatar?: S3Object;
  privacy?: boolean;
  paypalLink?: string;
  venmoLink?: string;
  showInExplore?: boolean;
}

export enum PresenceStatus {
  ON = 'ON',
  OFF = 'OFF'
}

export enum UserRole {
  STAFF = 'STAFF',
  PATRON = 'PATRON'
}

export enum OnboardingStep {
  ADD_PHOTO = 'ADD_PHOTO',
  ADD_SHIFT = 'ADD_SHIFT',
  ADD_LOCATION = 'ADD_LOCATION',
  ADD_PAYMENT_LINK = 'ADD_PAYMENT_LINK',
  COMPLETED = 'COMPLETED',
}

export interface NotificationSettings {
  muteMessage?: boolean;
  muteSWMRequest?: boolean;
  muteAll?: boolean;
}

export interface BlockProfileNotificationInput {
  recipientProfileID: string;
  profileID: string;
}

export interface ReportProfileNotificationInput {
  recipientUserID: string;
  profileID: string;
  reportedProfileID: string;
}

export interface BlockedProfile {
  profileID: string;
  blockedProfileID: string;
}

export interface ListStaffsSortByConnectionCountInput {
  gsiHash: string;
}

export interface ProfileUserConnection {
  fullName: string;
  userLocation?: UserLocation;
  deleted?: boolean;
  userName?: string;
}

export interface PaymentLinks {
  venmo?: string;
  paypal?: string;
}

export interface ChangePrivacyNotificationInput {
  profileID: string;
  privacy?: boolean;
  showInExplore?: boolean;
}
