import { UserRole } from "./profile.interface";

export interface UserNote {
  id: string;
  __typename: string;
  userID: string;
  recipientProfileID: string;
  title: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserNoteInput {
  role: UserRole;
  title: string;
  recipientProfileID: string;
  description: string;
}

export interface UpdateUserNoteInput {
  title?: string;
  description?: string;
}