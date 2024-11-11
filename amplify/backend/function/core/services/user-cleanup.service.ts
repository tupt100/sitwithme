import { GsiHash } from '@swm-core/interfaces/profile-leaderboard.interface';
import { User } from '@swm-core/interfaces/user.interface';
import { ExploreProfileService } from './explore-profile.service';
import { FollowingService } from './following.service';
import { MessageService } from './message.service';
import { NotificationService } from './notification.service';
import { PostService } from './post.service';
import { ProfileDeviceTokenService } from './profile-devicetoken.service';
import { ProfileLeaderboardService } from './profile-leaderboard.service';
import { ProfileRecentViewService } from './profile-recent-view.service';
import { ProfileSubscriptionService } from './profile-subscription.service';
import { ProfileService } from './profile.service';
import { ReportedProfileService } from './reported-profile.service';
import { StaffLeaderboardService } from './staff-leaderboard.service';
import { TransactionService } from './transaction.service';
import { VenueLeaderboardService } from './venue-leaderboard.service';
import { WorkplaceService } from './workplace.service';

const exploreProfileService = new ExploreProfileService();
const messageService = new MessageService();
const profileService = new ProfileService();
const followingService = new FollowingService();
const staffLeaderboardService = new StaffLeaderboardService();
const profileLeaderboardService = new ProfileLeaderboardService();
const postService = new PostService();
const notificationService = new NotificationService();
const profileDeviceTokenService = new ProfileDeviceTokenService();
const venueLeaderboardService = new VenueLeaderboardService();
const workplaceService = new WorkplaceService();
const reportedProfileService = new ReportedProfileService();
const transactionService = new TransactionService();
const profileSubscriptionService = new ProfileSubscriptionService();
const profileRecentViewSerevice = new ProfileRecentViewService();

export class UserCleanupService {

  /**
   * Cleanup all User data related
   * @param user User
   */
  async cleanUpUser(user: User) {
    if (!user.deleted) {
      throw new Error('User must be deleted before cleanup');
    }

    /////
    // General sync for both profiles
    /////
    // Prevent search profile: sync deleted flag to profiles
    console.log('[cleanUpUser] clean up both profiles');
    console.log('[cleanUpUser] updateUserConnection');
    await profileService.updateUserConnection(user);

    // Prevent search conversation: sync deleted flag to profile conversations to prevent messages
    console.log('[cleanUpUser] updaterofileConversationConnection');
    await messageService.updateProfileConversationConnection({ user });

    /////
    // Sync for each profiles
    /////
    console.log('[cleanUpUser] cleanUpStaff');
    await this.cleanUpStaff(user);

    console.log('[cleanUpUser] cleanUpPatron');
    await this.cleanUpPatron(user);
  }

  /**
   * Clean up permanently all User data related
   *
   * @param user User
   */
  async cleanUpUserPermanently(user: User) {
    /////
    // Sync for each profiles
    /////
    console.log('[cleanUpUserPermanently] cleanUpStaff');
    await this.cleanUpStaffPermanently(user);

    console.log('[cleanUpUserPermanently] cleanUpPatron');
    await this.cleanUpPatronPermanently(user);
  }

  async cleanUpStaffPermanently(user: User) {
    const staff = await profileService.getStaffByUserID(user.id);
    if (!staff) return;

    console.log('[cleanUpStaffPermanently] begin');
    let tasks: Promise<any>[] = [];

    // delete block profiles
    console.log('[cleanUpStaffPermanently] delete block profiles');
    let blockedProfiles = await profileService.allBlockedProfiles(staff.id);
    blockedProfiles = [...blockedProfiles, ...(await profileService.allBlockedProfilesByBlockedProfileID(staff.id))];
    await profileService.batchDeleteBlockedProfiles(
      blockedProfiles.map(bp => ({ profileID: bp.profileID, blockedProfileID: bp.blockedProfileID }))
    );

    /////
    // delete Message and conversation related
    /////
    // delete profile conversations
    console.log('[cleanUpStaffPermanently] delete profile conversation');
    let profileConversations = await messageService.allProfileNormalConversations(staff.id);
    let conversationIDs = profileConversations.map(pc => pc.conversationID);
    tasks = conversationIDs.map(async (conversationID) => {
      return messageService.deleteProfileConversationsByConversationID(conversationID)
    });
    if (tasks.length) await Promise.all(tasks);

    // delete message reaction
    console.log('[cleanUpStaffPermanently] delete message reaction');
    const reactions = await messageService.allMessageReactionsByProfileID(staff.id);
    if (reactions.length) {
      await messageService.deleteMessageReactions(reactions);
    }

    // delete messages
    console.log('[cleanUpStaffPermanently] delete message');
    tasks = conversationIDs.map(async (conversationID) => {
      return messageService.deleteMessagesByConversationID(conversationID);
    });
    while (tasks.length) {
      await Promise.all(tasks.splice(0, 20));
    }

    // delete broadcast and conversation
    console.log('[cleanUpStaffPermanently] delete broadcast and conversation');
    const broadcasts = await messageService.listBroadcastsByStaffID(staff.id);
    conversationIDs = [...conversationIDs, ...(broadcasts.map(b => b.id))];
    if (conversationIDs.length) await messageService.deleteConversations(conversationIDs);

    /////
    // cleanup notifications
    /////
    console.log('[cleanUpStaffPermanently] delete notifications');
    let notifs = await notificationService.allNotificationsBySenderProfileID(staff.id);
    notifs = [
      ...notifs,
      ...(await notificationService.allNotificationsByRecipientProfileID(staff.id))
    ];
    await notificationService.batchDelete(notifs.map(n => n.id));


    /////
    // cleanup shifts and all related
    /////
    console.log('[cleanUpStaffPermanently] delete workplaces');
    const workplaces = await workplaceService.allWorkplacesByProfileID(staff.id);
    if (workplaces.length) {
      // it will trigger clean up Shift
      // Shift will trigger clean up Explore Profile
      await workplaceService.batchDelete(workplaces.map(w => w.id));
    }

    /////
    // cleanup following
    /////
    console.log('[cleanUpStaffPermanently] delete following');
    const followings = await followingService.allFollowingByStaffID(staff.id);
    if (followings.length) {
      await followingService.batchDelete(
        followings.map(f => ({ staffID: f.staffID, patronID: f.patronID }))
      );
    }

    /////
    // cleanup device token
    /////
    console.log('[cleanUpStaffPermanently] delete device token');
    const tokens = await profileDeviceTokenService.listProfileDeviceToken(staff.id);
    if (tokens.length) {
      await profileDeviceTokenService.batchDelete(tokens);
    }

    /////
    // cleanup Post
    /////
    console.log('[cleanUpStaffPermanently] delete posts');
    const posts = await postService.allPostsByProfileID(staff.id);
    if (posts.length) {
      tasks = posts.map(async (p) => {
        return postService.delete(p.id);
      })

      while (tasks.length) {
        await Promise.all(tasks.splice(0, 20));
      }
    }

    // clean up reported profiles
    console.log('[cleanUpStaffPermanently] delete reports');
    let reports = await reportedProfileService.allReportsByProfileID(staff.id);
    reports = [
      ...reports,
      ...(await reportedProfileService.allReportsByReportedProfileID(staff.id))
    ];
    await reportedProfileService.batchDelete(reports.map(r => r.id));

    // cleanup profile recent views
    console.log('[cleanUpStaffPermanently] delete profile recent views');
    let recentViews = await profileRecentViewSerevice.allProfileRecentViewsByProfileID(staff.id);
    recentViews = [
      ...recentViews,
      ...(await profileRecentViewSerevice.allProfileRecentViewsByProfileRecentViewID(staff.id))
    ];
    if (recentViews.length) {
      await profileRecentViewSerevice.batchDelete(recentViews);
    }


    // delete staff profile
    console.log('[cleanUpStaffPermanently] delete profile');
    await profileService.delete(staff.id);
  }

  async cleanUpPatronPermanently(user: User) {
    const patron = await profileService.getPatronByUserID(user.id);
    if (!patron) return;

    console.log('[cleanUpPatronPermanently] begin');
    let tasks: Promise<any>[] = [];

    // delete block profiles
    console.log('[cleanUpPatronPermanently] delete block profiles');
    let blockedProfiles = await profileService.allBlockedProfiles(patron.id);
    blockedProfiles = [...blockedProfiles, ...(await profileService.allBlockedProfilesByBlockedProfileID(patron.id))];
    await profileService.batchDeleteBlockedProfiles(
      blockedProfiles.map(bp => ({ profileID: bp.profileID, blockedProfileID: bp.blockedProfileID }))
    );

    /////
    // delete Message and conversation related
    /////
    // delete profile conversations
    console.log('[cleanUpPatronPermanently] delete profile conversation');
    let profileConversations = await messageService.allProfileNormalConversations(patron.id);
    let conversationIDs = profileConversations.map(pc => pc.conversationID);
    tasks = conversationIDs.map(async (conversationID) => {
      return messageService.deleteProfileConversationsByConversationID(conversationID)
    });
    if (tasks.length) await Promise.all(tasks);

    // delete message reaction
    console.log('[cleanUpPatronPermanently] delete message reaction');
    const reactions = await messageService.allMessageReactionsByProfileID(patron.id);
    if (reactions.length) {
      await messageService.deleteMessageReactions(reactions);
    }

    // delete messages
    console.log('[cleanUpPatronPermanently] delete message');
    tasks = conversationIDs.map(async (conversationID) => {
      return messageService.deleteMessagesByConversationID(conversationID);
    });
    while (tasks.length) {
      await Promise.all(tasks.splice(0, 20));
    }

    // delete conversation
    console.log('[cleanUpPatronPermanently] delete conversation');
    if (conversationIDs.length) await messageService.deleteConversations(conversationIDs);

    /////
    // cleanup notifications
    /////
    console.log('[cleanUpPatronPermanently] delete notifications');
    let notifs = await notificationService.allNotificationsBySenderProfileID(patron.id);
    notifs = [
      ...notifs,
      ...(await notificationService.allNotificationsByRecipientProfileID(patron.id))
    ];
    await notificationService.batchDelete(notifs.map(n => n.id));

    /////
    // cleanup venue favorites and leaderboard
    /////
    // venue favorites
    console.log('[cleanUpPatronPermanently] delete venue favorites');
    const venueFavorites = await workplaceService.allFavoriteVenuesV2ByProfileID(patron.id);
    if (venueFavorites.length) {
      await workplaceService.deleteVenueFavories(venueFavorites);
    }

    /////
    // cleanup following
    /////
    console.log('[cleanUpPatronPermanently] delete following');
    const followings = await followingService.allFollowingByPatronID(patron.id);
    console.log('[cleanUpPatronPermanently] total following', followings.length);
    if (followings.length) {
      await followingService.batchDelete(
        followings.map(f => ({ staffID: f.staffID, patronID: f.patronID }))
      );
    }

    /////
    // cleanup device token
    /////
    console.log('[cleanUpPatronPermanently] delete device token');
    const tokens = await profileDeviceTokenService.listProfileDeviceToken(patron.id);
    if (tokens.length) {
      await profileDeviceTokenService.batchDelete(tokens);
    }

    /////
    // cleanup Post
    /////
    console.log('[cleanUpPatronPermanently] delete posts');
    const posts = await postService.allPostsByProfileID(patron.id);
    if (posts.length) {
      tasks = posts.map(async (p) => {
        return postService.delete(p.id);
      })

      while (tasks.length) {
        await Promise.all(tasks.splice(0, 20));
      }
    }

    // clean up reported profiles
    console.log('[cleanUpPatronPermanently] delete reports');
    let reports = await reportedProfileService.allReportsByProfileID(patron.id);
    reports = [
      ...reports,
      ...(await reportedProfileService.allReportsByReportedProfileID(patron.id))
    ];
    await reportedProfileService.batchDelete(reports.map(r => r.id));

    /////
    // cleanup subscriptions and transactions
    /////
    const transactions = await transactionService.allTransactionsByProfileID(patron.id);
    if (transactions.length) {
      // collects all transaction histories
      const historiesPromise = transactions.map(async (t) => {
        return transactionService.allTransactionHistoriesByTransactionID(t.id);
      });
      let histories = [];
      while (historiesPromise.length) {
        histories = [
          ...histories,
          ...(await Promise.all(historiesPromise.splice(0, 20)))
        ];
      }

      // delete all transaction histories
      console.log('[cleanUpPatronPermanently] delete histories');
      if (histories.length) {
        await transactionService.deleteTransactionHistories(histories.flat());
      }

      // delete all transactions
      console.log('[cleanUpPatronPermanently] delete transactions');
      await transactionService.deleteTransactions(transactions);
    }
    // cleanup profile subscriptions
    console.log('[cleanUpPatronPermanently] delete subscriptions');
    const subscriptions = await profileSubscriptionService.allSubscriptionsByProfileID(patron.id);
    await profileSubscriptionService.batchDelete(subscriptions);

    // cleanup profile recent views
    console.log('[cleanUpPatronPermanently] delete profile recent views');
    let recentViews = await profileRecentViewSerevice.allProfileRecentViewsByProfileID(patron.id);
    recentViews = [
      ...recentViews,
      ...(await profileRecentViewSerevice.allProfileRecentViewsByProfileRecentViewID(patron.id))
    ];
    if (recentViews.length) {
      await profileRecentViewSerevice.batchDelete(recentViews);
    }

    // delete staff profile
    console.log('[cleanUpPatronPermanently] delete profile');
    await profileService.delete(patron.id);
  }

  async cleanUpStaff(user: User) {
    const staff = await profileService.getStaffByUserID(user.id);
    if (!staff) return;

    console.log('[cleanUpStaff] begin');

    // Prevent search following: sync deleted flag to following
    console.log('[cleanUpStaff] updateStaffFollowingConnections');
    await followingService.updateStaffFollowingConnections({
      staffID: staff.id,
      staffProfileConnection: {
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
        deleted: user.deleted
      }
    });

    // Prevent explore profile: sync deleted flag to explore profile
    console.log('[cleanUpStaff] updateExploreProfileConnection');
    await exploreProfileService.updateExploreProfileConnection({ user });

    /////
    // Update Profile Leaderboard
    /////
    // update profile leader of other patron
    console.log('[cleanUpStaff] clean up leaderboard');
    const followings = await followingService.listFollowingConfirmedByPatronID(staff.id);
    let tasks: Promise<any>[] = [];
    tasks = followings.map(async (f) => {
      return await profileLeaderboardService.updateConnectionCount(f.patronID, -1);
    });
    if (tasks.length) await Promise.all(tasks);

    // invalidate cache: other staffs "sitting with" information
    tasks = followings.map(async (f) => {
      return await profileService.updateSittingWithTotal(f.staffID, -1);
    });
    if (tasks.length) await Promise.all(tasks);

    // sync to profile leaderboard to avoid ranking
    await profileLeaderboardService.update(staff.id, { gsiHash: GsiHash.PatronLeaderboardDeleted });

    /////
    // Clean up conversations and messages
    /////
    // hide all related conversations
    console.log('[cleanUpStaff] clean up conversations and messages');
    tasks = followings.map(async (f) => {
      return await messageService.syncConversationFromFollowingTable(f.patronID, staff.id, { hide: true });
    });
    if (tasks.length) await Promise.all(tasks);

    /////
    // Remove all blocked profiles
    /////
    console.log('[cleanUpStaff] Remove all blocked profiles');
    const blockedProfiles = await profileService.allBlockedProfilesByBlockedProfileID(staff.id);
    tasks = blockedProfiles.map(async (blockedProfile) => {
      return await profileService.removeBlockedProfiles(blockedProfile.profileID, blockedProfile.blockedProfileID);
    });
    if (tasks.length) await Promise.all(tasks);

    // Prevent search post
    console.log('[cleanUpStaff] Prevent search post');
    await postService.syncUserDeletedToProfilePosts(staff.id, true);

    // Cleanup notif and request SWM
    console.log('[cleanUpStaff] Cleanup notif and request SWM');
    const notifications = await notificationService.allNotificationsBySenderProfileID(staff.id);
    await notificationService.batchDelete(notifications.map(notif => notif.id));
    await followingService.deleteStaffSWMRequest(staff.id);

    // Cleanup profile device token
    console.log('[cleanUpStaff] Cleanup profile device token');
    await profileDeviceTokenService.deleteAllTokensByProfileID(staff.id);

    // Cleanup reported profiles
    console.log('[cleanUpStaff] delete reports');
    let reports = await reportedProfileService.allReportsByProfileID(staff.id);
    reports = [
      ...reports,
      ...(await reportedProfileService.allReportsByReportedProfileID(staff.id))
    ];
    await reportedProfileService.batchDelete(reports.map(r => r.id));

    // cleanup profile recent views
    console.log('[cleanUpStaff] delete profile recent views');
    let recentViews = await profileRecentViewSerevice.allProfileRecentViewsByProfileID(staff.id);
    recentViews = [
      ...recentViews,
      ...(await profileRecentViewSerevice.allProfileRecentViewsByProfileRecentViewID(staff.id))
    ];
    if (recentViews.length) {
      await profileRecentViewSerevice.batchDelete(recentViews);
    }
  }

  async cleanUpPatron(user: User) {
    const patron = await profileService.getPatronByUserID(user.id);
    if (!patron) return;

    console.log('[cleanUpPatron] begin');

    // sync to following
    console.log('[cleanUpPatron] updatePatronFollowingConnections');
    await followingService.updatePatronFollowingConnections({
      patronID: patron.id,
      patronProfileConnection: {
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
        deleted: user.deleted
      }
    });

    /////
    // Update Profile Leaderboard
    /////
    // @deprecated: update staff leaderboard of other staffs
    console.log('[cleanUpPatron] clean up leaderboard');
    const followings = await followingService.listFollowingConfirmedByPatronID(patron.id);
    let tasks: Promise<any>[] = [];
    tasks = followings.map(async (f) => {
      return await staffLeaderboardService.updateConnectionCount(f.staffID, -1)
    });
    if (tasks.length) await Promise.all(tasks);

    // update profile leader of other staff
    tasks = followings.map(async (f) => {
      return await profileLeaderboardService.updateConnectionCount(f.staffID, -1);
    });
    if (tasks.length) await Promise.all(tasks);

    // invalidate cache: other staffs "sitting with" information
    tasks = followings.map(async (f) => {
      return await profileService.updateSittingWithTotal(f.staffID, -1);
    });
    if (tasks.length) await Promise.all(tasks);

    // sync to profile leaderboard to avoid ranking
    await profileLeaderboardService.update(patron.id, { gsiHash: GsiHash.PatronLeaderboardDeleted });

    /////
    // Clean up conversations and messages
    /////
    // hide all related conversations
    console.log('[cleanUpPatron] clean up conversations and messages');
    tasks = followings.map(async (f) => {
      return await messageService.syncConversationFromFollowingTable(f.staffID, patron.id, { hide: true });
    });
    if (tasks.length) await Promise.all(tasks);

    /////
    // Remove all blocked profiles
    /////
    console.log('[cleanUpPatron] Remove all blocked profiles');
    const blockedProfiles = await profileService.allBlockedProfilesByBlockedProfileID(patron.id);
    tasks = blockedProfiles.map(async (blockedProfile) => {
      return await profileService.removeBlockedProfiles(blockedProfile.profileID, blockedProfile.blockedProfileID);
    });
    if (tasks.length) await Promise.all(tasks);

    // Prevent search post
    console.log('[cleanUpPatron] Prevent search post');
    await postService.syncUserDeletedToProfilePosts(patron.id, true);

    // Cleanup notif and request SWM
    console.log('[cleanUpPatron] Cleanup notif and request SWM');
    const notifications = await notificationService.allNotificationsBySenderProfileID(patron.id);
    await notificationService.batchDelete(notifications.map(notif => notif.id));
    await followingService.deleteStaffSWMRequest(patron.id);

    // Cleanup profile device token
    console.log('[cleanUpPatron] Cleanup profile device token');
    await profileDeviceTokenService.deleteAllTokensByProfileID(patron.id);

    // Reduce venue leaderboard ranking
    console.log('[cleanUpPatron] Reduce venue leaderboard ranking');
    const venues = await workplaceService.allFavoriteVenuesV2ByProfileID(patron.id);
    tasks = venues.map(async (venue) => {
      return await venueLeaderboardService.updateConnectionCount(venue.yelpBusinessID, -1);
    });
    if (tasks.length) await Promise.all(tasks);

    // Cleanup reported profiles
    console.log('[cleanUpPatron] delete reports');
    let reports = await reportedProfileService.allReportsByProfileID(patron.id);
    reports = [
      ...reports,
      ...(await reportedProfileService.allReportsByReportedProfileID(patron.id))
    ];
    await reportedProfileService.batchDelete(reports.map(r => r.id));

    // cleanup profile recent views
    console.log('[cleanUpPatron] delete profile recent views');
    let recentViews = await profileRecentViewSerevice.allProfileRecentViewsByProfileID(patron.id);
    recentViews = [
      ...recentViews,
      ...(await profileRecentViewSerevice.allProfileRecentViewsByProfileRecentViewID(patron.id))
    ];
    if (recentViews.length) {
      await profileRecentViewSerevice.batchDelete(recentViews);
    }
  }
}
