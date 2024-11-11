import { Geolocation, Location } from './location.interface';
import { YelpCategory } from './workplace.interface';

export interface ExploreProfile {
  __typename: string;
  jobID: string;
  workplaceID: string;
  profileID: string;
  endDate?: string;
  workplaceConnection: ShiftWorkplaceConnection;
  yelpBusinessID: string;
  jobConnection: ShiftJobConnection;
  profileConnection: ShiftProfileConnection;
  'workplaceID#jobID'?: string;
  dutyRanges?: ExploreProfileDutyRanges[];
  createdAt?: string;
  updatedAt?: string;
  expired?: boolean;
}

export interface UpdateExploreProfileInput {
  workplaceConnection?: ShiftWorkplaceConnection;
}

export interface ShiftWorkplaceConnection {
  name: string;
  yelpBusinessID: string;
  location: Location;
  distance?: number;
  geolocation: Geolocation;
  categories: string[];
  yelpCategories: YelpCategory[];
  fullAddress: string;
  price: number;
  reviewCount: number;
  imageUrl: string;
  rating: number;
}

export interface ShiftJobConnection {
  name: string;
}

export interface ShiftProfileConnection {
  fullName: string;
  avatarID: string;
  blockedProfileIDs?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
  connectionCount: number;
  postCount: number;
  followingProfileIDs?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
  deleted?: boolean;
  privacy?: boolean;
  showInExplore?: boolean;
  userName?: string;
}

export interface ExploreProfileDutyRanges {
  start: string;
  end: string;
}

export enum ExploreProfileSortBy {
  DISTANCE = 'DISTANCE',
  POPULAR = 'POPULAR',
}
