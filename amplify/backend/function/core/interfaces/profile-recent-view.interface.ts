export interface ProfileRecentView {
  __typename: string;
  profileID: string;
  profileRecentViewID: string;
  createdAt: string;
}

export interface CreateProfileRecentViewInput {
  profileID: string;
  profileRecentViewID: string;
  createdAt?: string;
}