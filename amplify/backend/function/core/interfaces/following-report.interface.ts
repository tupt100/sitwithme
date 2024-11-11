export interface FollowingReport {
  id: string;
  __typename: string;
  staffID: string;
  staffProfileConnection: FollowingReportProfileConnection;

  patronID?: string;
  patronProfileConnection?: FollowingReportProfileConnection;

  confirmedAt?: string;
  leftAt?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface FollowingReportProfileConnection {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  deleted?: boolean;
  completedAt: string;
}

export interface CreateFollowingReportInput {
  staffID: string;
  patronID?: string;

  confirmedAt?: Date;
  leftAt?: Date;
}

export interface UpdateFollowingReportInput {
  staffProfileConnection?: Partial<FollowingReportProfileConnection>;
  patronProfileConnection?: Partial<FollowingReportProfileConnection>;
}
