export interface ProfileLeaderboard {
  profileID: string;
  connectionCount: number;
  __typename: string;
  gsiHash: GsiHash;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProfileLeaderboardInput {
  profileID: string;
  connectionCount: number;
  gsiHash: GsiHash;
}

export interface UpdateProfileLeaderboardInput {
  gsiHash: GsiHash;
}

export interface ListProfilesSortByConnectionCountFilter {
  gsiHash: GsiHash;
}

export enum GsiHash {
  StaffLeaderboard = 'StaffLeaderboard',
  PatronLeaderboard = 'PatronLeaderboard',
  StaffLeaderboardDeleted = 'StaffLeaderboardDeleted',
  PatronLeaderboardDeleted = 'PatronLeaderboardDeleted'
}