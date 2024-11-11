/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const me = /* GraphQL */ `
  query Me {
    me {
      id
      userName
      firstName
      lastName
      email
      role
      birthday
      gender
      phone
      rawPhone
      userLocation {
        name
      }
      lastSeat
      profiles {
        nextToken
      }
      photos {
        nextToken
      }
      disabled
      principalID
      createdAt
      updatedAt
    }
  }
`;
export const getPatronProfileOverviewStat = /* GraphQL */ `
  query GetPatronProfileOverviewStat {
    getPatronProfileOverviewStat {
      totalPhoto
      totalPosts
      totalSavedLocation
      totalSittingWith
    }
  }
`;
export const getStaffProfileOverviewStat = /* GraphQL */ `
  query GetStaffProfileOverviewStat {
    getStaffProfileOverviewStat {
      totalPhoto
      totalPosts
      totalSittingWith
      totalWorkplace
    }
  }
`;
export const getProfile = /* GraphQL */ `
  query GetProfile($input: GetProfileInput!) {
    getProfile(input: $input) {
      id
      bio
      role
      userID
      user {
        id
        userName
        firstName
        lastName
        email
        role
        birthday
        gender
        phone
        rawPhone
        lastSeat
        disabled
        principalID
        createdAt
        updatedAt
      }
      avatarID
      avatar {
        id
        url
        createdAt
        updatedAt
      }
      onboardingStep
      completedAt
      workplaces {
        nextToken
      }
      shifts {
        nextToken
      }
      notifications {
        nextToken
      }
      posts {
        nextToken
      }
      working {
        nextToken
      }

      followingDetail {

        presenceStatus
        lastOnlineAt
      }
      notificationSettings {
        muteMessage
        muteSWMRequest
        muteAll
      }
      blockedProfileIDs
      privacy
      memberShip
      presenceStatus
      lastOnlineAt
      createdAt
      updatedAt
    }
  }
`;
export const getOtherProfile = /* GraphQL */ `
  query GetOtherProfile($input: GetOtherProfileInput!) {
    getOtherProfile(input: $input) {
      id
      bio
      role
      userID
      user {
        id
        userName
        firstName
        lastName
        email
        role
        birthday
        gender
        phone
        rawPhone
        lastSeat
        disabled
        principalID
        createdAt
        updatedAt
      }
      avatarID
      avatar {
        id
        url
        createdAt
        updatedAt
      }
      onboardingStep
      completedAt
      workplaces {
        nextToken
      }
      shifts {
        nextToken
      }
      notifications {
        nextToken
      }
      posts {
        nextToken
      }
      working {
        nextToken
      }

      followingDetail {

        presenceStatus
        lastOnlineAt
      }
      notificationSettings {
        muteMessage
        muteSWMRequest
        muteAll
      }
      blockedProfileIDs
      privacy
      memberShip
      presenceStatus
      lastOnlineAt
      createdAt
      updatedAt
    }
  }
`;
export const searchProfilesFollowing = /* GraphQL */ `
  query SearchProfilesFollowing(
    $filter: SearchProfilesFollowingFilter!
    $limit: Int
    $offset: Int
  ) {
    searchProfilesFollowing(filter: $filter, limit: $limit, offset: $offset) {
      items {
        staffID
        patronID
        confirmedAt
        createdAt
        updatedAt
      }
      hasNext
      offset
    }
  }
`;
export const listPosts = /* GraphQL */ `
  query ListPosts($filter: ListPostInput!, $limit: Int, $nextToken: String) {
    listPosts(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        profileID
        photoID
        caption
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const exploreStaffProfile = /* GraphQL */ `
  query ExploreStaffProfile(
    $filter: exploreStaffProfileInput!
    $limit: Int
    $offset: Int
  ) {
    exploreStaffProfile(filter: $filter, limit: $limit, offset: $offset) {
      items {
        jobID
        workplaceID
        profileID
        createdAt
        updatedAt
      }
      offset
      hasNext
    }
  }
`;
export const exploreVenues = /* GraphQL */ `
  query ExploreVenues(
    $filter: exploreVenuesInput!
    $limit: Int
    $offset: Int
    $nextToken: String
  ) {
    exploreVenues(
      filter: $filter
      limit: $limit
      offset: $offset
      nextToken: $nextToken
    ) {
      items {
        yelpBusinessID
        name
        fullAddress
        categories
        price
        reviewCount
        imageUrl
        rating
        favorited
      }
      offset
      hasNext
      nextToken
    }
  }
`;
export const explorePhotos = /* GraphQL */ `
  query ExplorePhotos($filter: explorePhotosInput!, $limit: Int, $offset: Int) {
    explorePhotos(filter: $filter, limit: $limit, offset: $offset) {
      items {
        id
        profileID
        photoID
        caption
        createdAt
        updatedAt
      }
      hasNext
    }
  }
`;
export const listCategories = /* GraphQL */ `
  query ListCategories {
    listCategories {
      title
      alias
      subCategories {
        title
        alias
      }
    }
  }
`;
export const listShiftEventsByDateRange = /* GraphQL */ `
  query ListShiftEventsByDateRange($input: ListShiftsByDateRangeInput!) {
    listShiftEventsByDateRange(input: $input) {
      startDate
      endDate
      shifts {
        id
        jobID
        start
        end
        workplaceID
        profileID
        createdAt
        parentID
        alert
        updatedAt
      }
    }
  }
`;
export const listStaffShiftEvents = /* GraphQL */ `
  query ListStaffShiftEvents($input: ListStaffShiftEventsInput!) {
    listStaffShiftEvents(input: $input) {
      startDate
      endDate
      shifts {
        id
        jobID
        start
        end
        workplaceID
        profileID

        createdAt
        parentID
        alert
        updatedAt
      }
    }
  }
`;
export const getShiftEventDetail = /* GraphQL */ `
  query GetShiftEventDetail($input: ShiftEventDetailInput!) {
    getShiftEventDetail(input: $input) {
      id
      jobID
      job {
        id
        name
        type
        priority
        createdAt
        updatedAt
      }
      start
      end
      repeat {
        frequency
        every
        weekDay
        each
        month
      }
      workplaceID
      workplace {
        id
        name
        yelpBusinessID
        fullAddress
        profileID
        categories
        price
        reviewCount
        imageUrl
        rating
        createdAt
        updatedAt
      }
      profileID
      profile {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }

      createdAt
      parentID
      alert
      updatedAt
    }
  }
`;
export const getCurrentShiftEvent = /* GraphQL */ `
  query GetCurrentShiftEvent {
    getCurrentShiftEvent {
      id
      jobID
      job {
        id
        name
        type
        priority
        createdAt
        updatedAt
      }
      start
      end
      repeat {
        frequency
        every
        weekDay
        each
        month
      }
      workplaceID
      workplace {
        id
        name
        yelpBusinessID
        fullAddress
        profileID
        categories
        price
        reviewCount
        imageUrl
        rating
        createdAt
        updatedAt
      }
      profileID
      profile {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }

      createdAt
      parentID
      alert
      updatedAt
    }
  }
`;
export const searchYelpBusinesses = /* GraphQL */ `
  query SearchYelpBusinesses(
    $filter: SearchYelpBusinessesInput!
    $limit: Int
    $offset: Int
  ) {
    searchYelpBusinesses(filter: $filter, limit: $limit, offset: $offset) {
      items {
        name
        id
        fullAddress
      }
      hasNext
    }
  }
`;
export const getVenue = /* GraphQL */ `
  query GetVenue($input: VenueDetailInput!) {
    getVenue(input: $input) {
      yelpBusinessID
      name
      location {
        latitude
        longitude
      }
      fullAddress
      categories
      yelpCategories {
        title
        alias
      }
      price
      reviewCount
      imageUrl
      rating
      profiles {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      favorited
    }
  }
`;
export const searchVenuesFavorited = /* GraphQL */ `
  query SearchVenuesFavorited(
    $filter: SearchVenueFavoritesFilter!
    $limit: Int
    $offset: Int
  ) {
    searchVenuesFavorited(filter: $filter, limit: $limit, offset: $offset) {
      items {
        id
        yelpBusinessID
        profileID
        createdAt
        updatedAt
      }
      hasNext
      offset
    }
  }
`;
export const listStaffRecentViews = /* GraphQL */ `
  query ListStaffRecentViews {
    listStaffRecentViews {
      id
      bio


      role
      userID
      user {
        id
        userName
        firstName
        lastName
        email
        role
        birthday
        gender
        phone
        rawPhone
        lastSeat
        disabled
        principalID
        createdAt
        updatedAt
      }
      avatarID
      avatar {
        id
        url
        createdAt
        updatedAt
      }
      onboardingStep
      completedAt
      workplaces {
        nextToken
      }
      shifts {
        nextToken
      }
      notifications {
        nextToken
      }
      posts {
        nextToken
      }
      working {
        nextToken
      }

      followingDetail {

        presenceStatus
        lastOnlineAt
      }
      notificationSettings {
        muteMessage
        muteSWMRequest
        muteAll
      }
      blockedProfileIDs
      privacy
      memberShip
      presenceStatus
      lastOnlineAt
      createdAt
      updatedAt
    }
  }
`;
export const listPopularVenues = /* GraphQL */ `
  query ListPopularVenues($input: LocationInput) {
    listPopularVenues(input: $input) {
      yelpBusinessID
      name
      location {
        latitude
        longitude
      }
      fullAddress
      categories
      yelpCategories {
        title
        alias
      }
      price
      reviewCount
      imageUrl
      rating
      profiles {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      favorited
    }
  }
`;
export const listExploreRecentSearch = /* GraphQL */ `
  query ListExploreRecentSearch {
    listExploreRecentSearch
  }
`;
export const getConversation = /* GraphQL */ `
  query GetConversation($input: GetConversationInput!) {
    getConversation(input: $input) {
      id
      creatorProfileID
      creatorProfile {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      conversationType
      lastMessageAt
      totalMessage
      hide
      broadcastName
      blockedByProfileIDs
      messages {
        nextToken
      }
      profileConversations {
        nextToken
      }
      parentConversationID
      createdAt
      updatedAt
    }
  }
`;
export const getConversationBySender = /* GraphQL */ `
  query GetConversationBySender($input: GetConversationBySenderInput!) {
    getConversationBySender(input: $input) {
      id
      creatorProfileID
      creatorProfile {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      conversationType
      lastMessageAt
      totalMessage
      hide
      broadcastName
      blockedByProfileIDs
      messages {
        nextToken
      }
      profileConversations {
        nextToken
      }
      parentConversationID
      createdAt
      updatedAt
    }
  }
`;
export const searchConversations = /* GraphQL */ `
  query SearchConversations(
    $filter: SearchConversationsFilter!
    $limit: Int
    $offset: Int
  ) {
    searchConversations(filter: $filter, limit: $limit, offset: $offset) {
      items {
        id
        profileID
        conversationID
        conversationType
        lastMessageAt
        read
        muteUntil
        totalMessage
        hide
        ignore
        blockedByProfileID
        recipientUserID
        broadcastName
        deletedAt
        createdAt
        updatedAt
      }
      hasNext
      offset
    }
  }
`;
export const listRecipientSuggestions = /* GraphQL */ `
  query ListRecipientSuggestions($filter: ListRecipientSuggestionFilter!) {
    listRecipientSuggestions(filter: $filter) {
      id
      profileID
      profile {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      conversationID
      conversation {
        id
        creatorProfileID
        conversationType
        lastMessageAt
        totalMessage
        hide
        broadcastName
        blockedByProfileIDs
        parentConversationID
        createdAt
        updatedAt
      }
      conversationType
      lastMessageAt
      read
      muteUntil
      totalMessage
      hide
      ignore
      blockedByProfileID
      recipientConnection {
        userName
        firstName
        lastName
      }
      recipientUserID
      broadcastName
      deletedAt
      createdAt
      updatedAt
    }
  }
`;
export const listPatronsByBroadcastConversationID = /* GraphQL */ `
  query ListPatronsByBroadcastConversationID(
    $input: ListPatronsByBroadcastConversationIDInput!
  ) {
    listPatronsByBroadcastConversationID(input: $input) {
      id
      bio


      role
      userID
      user {
        id
        userName
        firstName
        lastName
        email
        role
        birthday
        gender
        phone
        rawPhone
        lastSeat
        disabled
        principalID
        createdAt
        updatedAt
      }
      avatarID
      avatar {
        id
        url
        createdAt
        updatedAt
      }
      onboardingStep
      completedAt
      workplaces {
        nextToken
      }
      shifts {
        nextToken
      }
      notifications {
        nextToken
      }
      posts {
        nextToken
      }
      working {
        nextToken
      }

      followingDetail {

        presenceStatus
        lastOnlineAt
      }
      notificationSettings {
        muteMessage
        muteSWMRequest
        muteAll
      }
      blockedProfileIDs
      privacy
      memberShip
      presenceStatus
      lastOnlineAt
      createdAt
      updatedAt
    }
  }
`;
export const listBlockedProfiles = /* GraphQL */ `
  query ListBlockedProfiles(
    $filter: ListBlockedProfilesFilter!
    $limit: Int
    $nextToken: String
  ) {
    listBlockedProfiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        profileID
        blockedProfileID
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const unreadNotificationsNumber = /* GraphQL */ `
  query UnreadNotificationsNumber($input: UnreadNotificationsNumberInput!) {
    unreadNotificationsNumber(input: $input) {
      total
      messages
      otherNotifications
    }
  }
`;
export const adminSearchUsers = /* GraphQL */ `
  query AdminSearchUsers(
    $filter: AdminSearchUsersFilter
    $limit: Int
    $nextToken: String
  ) {
    adminSearchUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        userName
        firstName
        lastName
        email
        role
        birthday
        gender
        phone
        rawPhone
        lastSeat
        disabled
        principalID
        createdAt
        updatedAt
      }
      nextToken
      total
    }
  }
`;
export const validateUniqueEmail = /* GraphQL */ `
  query ValidateUniqueEmail($input: AWSEmail!) {
    validateUniqueEmail(input: $input)
  }
`;
export const validateUniqueUsername = /* GraphQL */ `
  query ValidateUniqueUsername($input: String!) {
    validateUniqueUsername(input: $input)
  }
`;
export const getJob = /* GraphQL */ `
  query GetJob($id: ID!) {
    getJob(id: $id) {
      id
      name
      type
      priority
      createdAt
      updatedAt
    }
  }
`;
export const listJobs = /* GraphQL */ `
  query ListJobs(
    $filter: ModelJobFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listJobs(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        type
        priority
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getPhoto = /* GraphQL */ `
  query GetPhoto($id: ID!) {
    getPhoto(id: $id) {
      id
      url
      createdAt
      updatedAt
    }
  }
`;
export const listPhotos = /* GraphQL */ `
  query ListPhotos(
    $filter: ModelPhotoFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listPhotos(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        url
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const listProfiles = /* GraphQL */ `
  query ListProfiles(
    $filter: ModelProfileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listProfiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getReportedProfile = /* GraphQL */ `
  query GetReportedProfile($id: ID!) {
    getReportedProfile(id: $id) {
      id
      profileID
      reporterProfileDetail {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      reportedProfileID
      reportedProfileDetail {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      type
      content {
        type
      }
      archivedAt
      completedAt
      createdAt
      updatedAt
    }
  }
`;
export const listReportedProfiles = /* GraphQL */ `
  query ListReportedProfiles(
    $filter: ModelReportedProfileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listReportedProfiles(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        profileID
        reporterProfileDetail {
          user {
            email
          }
        }
        reportedProfileID
        reportedProfileDetail {
          user {
            email
          }
        }
        type
        content {
          type
        }
        archivedAt
        completedAt
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const listReportedProfilesByGroup = /* GraphQL */ `
  query listReportedProfilesByGroup(
    $filter: ModelReportedProfileFilterInput
    $limit: Int
    $nextToken: String
    $group: String
    $createdAt: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
  ) {
    listReportedProfilesByGroup(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      group: $group
      createdAt: $createdAt
      sortDirection: $sortDirection
    ) {
      items {
        id
        profileID
        reporterProfileDetail {
          user {
            id
            email
          }
        }
        reportedProfileID
        reportedProfileDetail {
          user {
            id
            email
          }
        }
        type
        content {
          type
        }
        archivedAt
        completedAt
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const listReportedProfilesByStatus = /* GraphQL */ `
  query listReportedProfilesByStatus(
    $filter: ModelReportedProfileFilterInput
    $limit: Int
    $nextToken: String
    $status: ReportedProfileStatus
    $createdAt: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
  ) {
    listReportedProfilesByStatus(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      status: $status
      createdAt: $createdAt
      sortDirection: $sortDirection
    ) {
      items {
        id
        profileID
        status
        reporterProfileDetail {
          user {
            id
            email
          }
        }
        reportedProfileID
        reportedProfileDetail {
          user {
            id
            email
          }
        }
        type
        content {
          type
        }
        archivedAt
        completedAt
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getShift = /* GraphQL */ `
  query GetShift($id: ID!) {
    getShift(id: $id) {
      id
      jobID
      job {
        id
        name
        type
        priority
        createdAt
        updatedAt
      }
      start
      end
      repeat {
        frequency
        every
        weekDay
        each
        month
      }
      workplaceID
      workplace {
        id
        name
        yelpBusinessID
        fullAddress
        profileID
        categories
        price
        reviewCount
        imageUrl
        rating
        createdAt
        updatedAt
      }
      profileID
      profile {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }

      createdAt
      parentID
      alert
      updatedAt
    }
  }
`;
export const getUser = /* GraphQL */ `
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      userName
      firstName
      lastName
      email
      role
      birthday
      gender
      phone
      rawPhone
      userLocation {
        name
      }
      lastSeat
      profiles {
        nextToken
      }
      photos {
        nextToken
      }
      disabled
      principalID
      createdAt
      updatedAt
    }
  }
`;
export const listUsers = /* GraphQL */ `
  query ListUsers(
    $filter: ModelUserFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        userName
        firstName
        lastName
        email
        role
        birthday
        gender
        phone
        rawPhone
        lastSeat
        disabled
        principalID
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const listJobsByType = /* GraphQL */ `
  query ListJobsByType(
    $type: String
    $priority: ModelIntKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelJobFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listJobsByType(
      type: $type
      priority: $priority
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        name
        type
        priority
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const listStaffsSortByConnectionCount = /* GraphQL */ `
  query ListStaffsSortByConnectionCount(
    $gsiHash: String
    $connectionCount: ModelIntKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelStaffLeaderboardFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listStaffsSortByConnectionCount(
      gsiHash: $gsiHash
      connectionCount: $connectionCount
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        staffID
        gsiHash
        connectionCount
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const listProfilesByUser = /* GraphQL */ `
  query ListProfilesByUser(
    $userID: ID
    $sortDirection: ModelSortDirection
    $filter: ModelProfileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listProfilesByUser(
      userID: $userID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        bio


        role
        userID
        avatarID
        onboardingStep
        completedAt

        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const listPhotosByUser = /* GraphQL */ `
  query ListPhotosByUser(
    $userID: ID
    $sortDirection: ModelSortDirection
    $filter: ModelUserPhotoFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listPhotosByUser(
      userID: $userID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        userID
        createdByProfileID
        photoID
        caption
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const validateEmailSignup = /* GraphQL */ `
  query ValidateEmailSignup($input: AWSEmail!) {
    validateEmailSignup(input: $input)
  }
`;
export const validateUsernameSignup = /* GraphQL */ `
  query ValidateUsernameSignup($input: String!) {
    validateUsernameSignup(input: $input)
  }
`;
export const findCognitoUsernameByEmail = /* GraphQL */ `
  query FindCognitoUsernameByEmail($input: AWSEmail!) {
    findCognitoUsernameByEmail(input: $input)
  }
`;

export const getAppVersion = /* GraphQL */ `
  query GetAppVersion($id: ID!) {
    getAppVersion(id: $id) {
      id
      forceUpdated
      currentAppVersion
    }
  }
`;

export const listAppVersions = /* GraphQL */ `
  query ListAppVersions(
    $filter: ModelAppVersionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listAppVersions(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        forceUpdated
        currentAppVersion
      }
      nextToken
    }
  }
`;

export const listFollowingReports = /* GraphQL */ `
  query ListFollowingReports(
    $filter: ListFollowingReportFilter!
    $limit: Int
    $nextToken: String
  ) {
    listFollowingReports(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        staffID
        staffProfileConnection {
          userName
          firstName
          lastName
          email
        }
        totalFollowers
        newFollowers
      }
      nextToken
    }
  }
`;
