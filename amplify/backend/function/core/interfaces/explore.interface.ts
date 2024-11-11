import { Location } from './location.interface';

export interface ExploreStaffProfilesInput {
  profileID?: string;
  keyword?: string;
  jobType?: string[];
  duty?: boolean[];
  geoLocation: ExploreGeoLocation;
  price?: number[];
  cuisine?: string[];
}

interface ExploreGeoLocation {
  distance: number;
  location: Location;
}

export interface SearchStaffProfilesInput {
  profileID?: string;
  keyword?: string;
  geoLocation?: SearchGeoLocation;
}

interface SearchGeoLocation {
  distance: number;
  location: Location;
}

export interface ExploreVenuesInput extends ExploreStaffProfilesInput {};

export interface ExplorePostsInput {
  profileID?: string;
  keyword?: string;
}

export interface ExplorePatronProfilesInput {
  profileID?: string;
  keyword?: string;
  geoLocation?: ExploreGeoLocation;
}