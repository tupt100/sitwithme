export interface Presence {
  id: string;
  __typename: string;
  profileID: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePresenceInput {
  id: string;
  profileID: string;
  createdAt?: Date;
}