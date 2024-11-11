import { Location } from './location.interface';

export interface VenueLeaderboard {
  yelpBusinessID: string;
  favoriteCount: number;
  __typename: string;
  gsiHash: string;
  venueConnection: VenueConnection;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVenueLeaderboardInput {
  yelpBusinessID: string;
  favoriteCount: number;
  venueConnection: VenueConnection;
}

export interface VenueConnection {
  location: Location;
}
