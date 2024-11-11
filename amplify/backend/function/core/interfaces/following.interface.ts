export interface Following {
  staffID: string;
  __typename: string;
  staffProfileConnection: FollowingProfileConnection;
  patronID: string;
  patronProfileConnection: FollowingProfileConnection;
  confirmedAt?: string;
  requestedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FollowingProfileConnection {
  userName: string;
  firstName: string;
  lastName: string;
  deleted?: boolean;
}

export interface UpdateStaffProfileConnectionInput {
  staffID: string;
  staffProfileConnection: FollowingProfileConnection;
}

export interface UpdatePatronProfileConnectionInput {
  patronID: string;
  patronProfileConnection: FollowingProfileConnection;
}
