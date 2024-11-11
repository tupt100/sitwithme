export interface StaffLeaderboard {
  staffID: string;
  connectionCount: number;
  __typename: string;
  gsiHash: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffLeaderboardInput {
  staffID: string;
  connectionCount: number;
}
