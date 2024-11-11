import { v4 as uuidv4 } from 'uuid';
import { Gender, Role, User } from '@swm-core/interfaces/user.interface';
import { UserRole } from '@swm-core/interfaces/profile.interface';

export const generateUser = (user?: Partial<User>, suffix: number = 0) => {
  const now = new Date();

  return {
    id: uuidv4(),
    userName: `userName${suffix}`,
    firstName: `firstName ${suffix}`,
    lastName: `lastName ${suffix}`,
    email: `abc${suffix}@gmail.com`,
    role: Role.USER,
    birthday: now.toISOString(),
    gender: Gender.MALE,
    phone: '1234567890',
    rawPhone: '1234567890',
    userLocation: {
      name: `address ${suffix}`,
      location: {
        latitude: 0,
        longitude: 0,
      }
    },
    lastSeat: UserRole.PATRON,
    disabled: false,
    ...user,
  }
}