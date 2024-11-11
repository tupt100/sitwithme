import { v4 as uuidv4 } from 'uuid';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { S3Object } from '@swm-core/interfaces/file.interface';
import { Photo } from '@swm-core/interfaces/photo.interface';
import { OnboardingStep, PatronProfile, PaymentLinks, Profile, StaffProfile, UserRole } from '@swm-core/interfaces/profile.interface';
import { ShiftInput, ShiftInputRequest } from '@swm-core/interfaces/shift.interface';
import { PhotoService } from './photo.service';
import { ProfileService } from './profile.service';
import { S3Service } from './s3.service';
import { ShiftService } from './shift.service';
import { UserService } from './user.service';
import { UserLocation } from '@swm-core/interfaces/user.interface';

const photoService = new PhotoService();
const userService = new UserService();
const profileService = new ProfileService();
const shiftService = new ShiftService();
const s3Service = new S3Service();

const {
  STORAGE_ASSETS_BUCKETNAME,
  AWS_REGION
} = process.env;

export class OnboardingService {
  /**
   * 1. Check the User information first, if User does not have enough critical information, then reject
   * 2. A User only have a Patron profile. If user didn't have a Patron profile, then create a new one,
   *    else using the Patron exist profile.
   * 3. If user submit avatar, then remove old avatar and create a new Avatar for Patron Profile.
   */
  async onboardingPatron(userID: string, avatarInput?: S3Object, userLocation?: UserLocation): Promise<PatronProfile> {
    // 1. Check the User information first, if User does not have enough critical information, then reject
    const user = await userService.get(userID);
    if (user) {
      const filled = userService.basicInforFilled(user);
      if (!filled) {
        throw new PlatformException('Please fill the user basic information first.');
      }
    }

    // 2. A User only have a Patron profile. If user didn't have a Patron profile, then create a new one,
    // else using the Patron exist profile.
    let patron: PatronProfile = await profileService.getPatronByUserID(userID);
    if (!patron) {
      patron = await profileService.createPatron(userID);
    }

    // if (patron.completedAt) {
    //   throw new PlatformException('This patron already onboarding');
    // }

    // 3. If user submit avatar, then remove old avatar and create a new Avatar for Patron Profile.
    if (avatarInput || avatarInput === null) {
      let photo: Photo;
      if (patron.avatarID) {
        photo = await photoService.get(patron.avatarID);
        if (photo) {
          await photoService.delete(photo.id);
        }
      }
      if (avatarInput) {
        photo = await photoService.create(avatarInput);
      }
      patron = await profileService.update(patron.id, {
        avatarID: photo?.id || null,
        onboardingStep: OnboardingStep.ADD_LOCATION,
      });
    }

    if (userLocation || userLocation === null) {
      const now = new Date().toISOString();
      await userService.update({ userLocation }, { userId: userID });
      patron = await profileService.update(patron.id, {
        onboardingStep: OnboardingStep.COMPLETED,
        completedAt: now,
      });
    }

    return patron;
  }

  /**
   * 1. Check the User information first, if User does not have enough critical information, then reject
   * 2. A User only have a Staff profile. If user didn't have a Staff profile, then create a new one,
   * else using the Staff exist profile.
   * 3. throw Error if Staff already onboarding
   * 4. If user submit avatar, then remove old avatar and create a new Avatar for Staff Profile.
   * 5. If user submit userLocation, then update userLocation for user.
   * 6. If user submit shift, then create a new Shift and update profile completedAt field to finish onboarding.
   */
  async onboardingStaff(userID: string, avatarInput?: S3Object, userLocation?: UserLocation, shiftInputRequest?: ShiftInputRequest): Promise<StaffProfile> {
    // 1. Check the User information first, if User does not have enough critical information, then reject
    const user = await userService.get(userID);
    if (user) {
      const filled = userService.basicInforFilled(user);
      if (!filled) {
        throw new PlatformException('Please fill the user basic information first.');
      }
    }

    // 2. A User only have a Staff profile. If user didn't have a Staff profile, then create a new one,
    // else using the Staff exist profile.
    let staff: StaffProfile = await profileService.getStaffByUserID(userID);
    if (!staff) {
      staff = await profileService.createStaff(userID);
    }

    // 3. throw Error if Staff already onboarding
    if (staff.completedAt) {
      throw new PlatformException('This staff already onboarding');
    }

    // 4. If user submit avatar, then remove old avatar and create a new Avatar for Staff Profile.
    if (avatarInput || avatarInput === null) {
      let photo: Photo;
      if (staff.avatarID) {
        photo = await photoService.get(staff.avatarID);
        if (photo) {
          await photoService.delete(photo.id);
        }
      }
      if (avatarInput) {
        photo = await photoService.create(avatarInput);
      }
      staff = await profileService.update(staff.id, {
        avatarID: photo?.id || null,
        onboardingStep: OnboardingStep.ADD_LOCATION,
      });
    }

    // 5. If user submit userLocation, then update userLocation for user.
    if (userLocation || userLocation === null) {
      await userService.update({ userLocation }, { userId: userID });
      staff = await profileService.update(staff.id, {
        onboardingStep: OnboardingStep.ADD_SHIFT,
      });
    }

    // 6. If user submit shift, then create a new Shift and update profile completedAt field to finish onboarding.
    if (shiftInputRequest) {
      const shiftInput: ShiftInput = { ...shiftInputRequest, profileID: staff.id };
      await shiftService.create(shiftInput);
      const now = new Date().toISOString();
      staff = await profileService.update(staff.id, {
        onboardingStep: OnboardingStep.COMPLETED,
        completedAt: now,
      });
    }

    return staff;
  }

  /**
   * 1. Check the User information first, if User does not have enough critical information, then reject
   * 2. A User only have a Staff profile. If user didn't have a Staff profile, then create a new one,
   * else using the Staff exist profile.
   * 3. throw Error if Staff already onboarding
   * 4. If user submit avatar, then remove old avatar and create a new Avatar for Staff Profile.
   * 5. If user submit userLocation, then update userLocation for user.
   * 6. If user submit paymentLinks, then update paymentLinks for Staff
   * 7. If user submit shift, then create a new Shift and update profile completedAt field to finish onboarding.
   */
  async onboardingStaffV2(userID: string, avatarInput?: S3Object, userLocation?: UserLocation, shiftInputRequest?: ShiftInputRequest, paymentLinks?: PaymentLinks): Promise<StaffProfile> {
    // 1. Check the User information first, if User does not have enough critical information, then reject
    const user = await userService.get(userID);
    if (user) {
      const filled = userService.basicInforFilled(user);
      if (!filled) {
        throw new PlatformException('Please fill the user basic information first.');
      }
    }

    // 2. A User only have a Staff profile. If user didn't have a Staff profile, then create a new one,
    // else using the Staff exist profile.
    let staff: StaffProfile = await profileService.getStaffByUserID(userID);
    if (!staff) {
      staff = await profileService.createStaff(userID);
    }

    // 3. throw Error if Staff already onboarding
    if (staff.completedAt) {
      throw new PlatformException('This staff already onboarding');
    }

    // 4. If user submit avatar, then remove old avatar and create a new Avatar for Staff Profile.
    if (avatarInput || avatarInput === null) {
      let photo: Photo;
      if (staff.avatarID) {
        photo = await photoService.get(staff.avatarID);
        if (photo) {
          await photoService.delete(photo.id);
        }
      }
      if (avatarInput) {
        photo = await photoService.create(avatarInput);
      }
      staff = await profileService.update(staff.id, {
        avatarID: photo?.id || null,
        onboardingStep: OnboardingStep.ADD_LOCATION,
      });
    }

    // 5. If user submit userLocation, then update userLocation for user.
    if (userLocation || userLocation === null) {
      await userService.update({ userLocation }, { userId: userID });
      staff = await profileService.update(staff.id, {
        onboardingStep: OnboardingStep.ADD_PAYMENT_LINK,
      });
    }

    // 6. If user submit paymentLinks, then update paymentLinks for Staff
    if (paymentLinks || paymentLinks === null) {
      if (paymentLinks) {
        profileService.validatePaymentLinks(paymentLinks);
      }
      staff = await profileService.update(staff.id, {
        venmoLink: paymentLinks?.venmo || null,
        paypalLink: paymentLinks?.paypal || null,
        onboardingStep: OnboardingStep.ADD_SHIFT,
      });
    }

    // 7. If user submit shift, then create a new Shift and update profile completedAt field to finish onboarding.
    if (shiftInputRequest) {
      const shiftInput: ShiftInput = { ...shiftInputRequest, profileID: staff.id };
      await shiftService.create(shiftInput);
      const now = new Date().toISOString();
      staff = await profileService.update(staff.id, {
        onboardingStep: OnboardingStep.COMPLETED,
        completedAt: now,
      });
    }

    return staff;
  }

  /**
   * Staff profile must be completed
   * Patron profile must not existed
   */
  async canCreatePatronFromStaffProfile(oldProfile: Profile, newProfile: Profile) {
    return newProfile.role === UserRole.STAFF &&
      oldProfile.onboardingStep !== OnboardingStep.COMPLETED &&
      newProfile.onboardingStep === OnboardingStep.COMPLETED &&
      !(await profileService.getPatronByUserID(newProfile.userID))
  }

  async createPatronFromStaffProfile(staffProfile: Profile) {
    let avatarInput: S3Object;
    if (staffProfile.avatarID) {
      console.log('Start get staff avatar', staffProfile.avatarID);
      const avatarS3Object = await photoService.get(staffProfile.avatarID);
      console.log('Staff avatar', avatarS3Object);

      if (avatarS3Object) {
        const staffAvatarKey = avatarS3Object.s3Metadata.key
        try {
          const staffAvatar = await s3Service.getObject({
            Bucket: avatarS3Object.s3Metadata.bucket,
            Key: staffAvatarKey,
          });
          console.log('Staff avatar S3Object', avatarS3Object);
          if (staffAvatar) {
            const patronAvatarKey = staffAvatarKey.replace(/\/(?=[^\/]*$).*\./, `/${uuidv4()}.`);
            await s3Service.putObject({
              Body: staffAvatar.Body,
              Bucket: STORAGE_ASSETS_BUCKETNAME,
              ContentType: staffAvatar.ContentType,
              Key: patronAvatarKey,
              StorageClass: 'STANDARD'
            });
            avatarInput = {
              bucket: STORAGE_ASSETS_BUCKETNAME,
              region: AWS_REGION,
              key: patronAvatarKey,
            }
          }
        } catch (e) {
          console.log('Get staff avatar from S3 got error: ', e);
        }
      }
    }
    const user = await userService.get(staffProfile.userID);
    await this.onboardingPatron(staffProfile.userID, avatarInput || null, user.userLocation || null);
  }
}