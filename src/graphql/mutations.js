/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const initUser = /* GraphQL */ `
  mutation InitUser($input: InitUserInput!) {
    initUser(input: $input) {
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
export const switchSeat = /* GraphQL */ `
  mutation SwitchSeat {
    switchSeat
  }
`;
export const blockProfile = /* GraphQL */ `
  mutation BlockProfile($input: BlockProfileInput!) {
    blockProfile(input: $input) {
      profileID
      blockedProfileID
      blockedProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      blockedProfileDetail {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;
export const unblockProfile = /* GraphQL */ `
  mutation UnblockProfile($input: UnblockProfileInput!) {
    unblockProfile(input: $input) {
      profileID
      blockedProfileID
      blockedProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      blockedProfileDetail {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;
export const reportProfile = /* GraphQL */ `
  mutation ReportProfile($input: ReportProfileInput!) {
    reportProfile(input: $input) {
      id
      profileID
      reporterProfileDetail {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
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
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
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
export const createProfileDeviceToken = /* GraphQL */ `
  mutation CreateProfileDeviceToken($input: CreateProfileDeviceTokenInput!) {
    createProfileDeviceToken(input: $input) {
      profileID
      deviceToken
      createdAt
      updatedAt
    }
  }
`;
export const deleteProfileDeviceToken = /* GraphQL */ `
  mutation DeleteProfileDeviceToken($input: DeleteProfileDeviceTokenInput!) {
    deleteProfileDeviceToken(input: $input) {
      profileID
      deviceToken
      createdAt
      updatedAt
    }
  }
`;
export const deleteUserDeviceToken = /* GraphQL */ `
  mutation DeleteUserDeviceToken($input: DeleteUserDeviceTokenInput!) {
    deleteUserDeviceToken(input: $input)
  }
`;
export const onboardingPatron = /* GraphQL */ `
  mutation OnboardingPatron($input: OnboardingPatronInput) {
    onboardingPatron(input: $input) {
      id
      bio
      duty

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
      followingStatus
      followingDetail {
        followingStatus
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
export const onboardingStaff = /* GraphQL */ `
  mutation OnboardingStaff($input: OnboardingStaffInput) {
    onboardingStaff(input: $input) {
      id
      bio
      duty

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
      followingStatus
      followingDetail {
        followingStatus
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
export const createUserPhoto = /* GraphQL */ `
  mutation CreateUserPhoto($input: CreateUserPhotoInput!) {
    createUserPhoto(input: $input) {
      id
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
      createdByProfileID
      createdByProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      photoID
      photo {
        id
        url
        createdAt
        updatedAt
      }
      caption
      createdAt
      updatedAt
    }
  }
`;
export const deleteUserPhoto = /* GraphQL */ `
  mutation DeleteUserPhoto($input: DeleteUserPhotoInput!) {
    deleteUserPhoto(input: $input)
  }
`;
export const updateProfile = /* GraphQL */ `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
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
export const createPost = /* GraphQL */ `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      profileID
      profile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      profileConnection {
        privacy
        blockedProfileIDs
      }
      photoID
      photo {
        id
        url
        createdAt
        updatedAt
      }
      caption
      createdAt
      updatedAt
    }
  }
`;
export const updatePost = /* GraphQL */ `
  mutation UpdatePost($input: UpdatePostInput!) {
    updatePost(input: $input) {
      id
      profileID
      profile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      profileConnection {
        privacy
        blockedProfileIDs
      }
      photoID
      photo {
        id
        url
        createdAt
        updatedAt
      }
      caption
      createdAt
      updatedAt
    }
  }
`;
export const deletePost = /* GraphQL */ `
  mutation DeletePost($input: DeletePostInput!) {
    deletePost(input: $input)
  }
`;
export const createWorkplace = /* GraphQL */ `
  mutation CreateWorkplace($input: CreateWorkplaceInput!) {
    createWorkplace(input: $input) {
      id
      name
      yelpBusinessID
      location {
        latitude
        longitude
      }
      fullAddress
      profileID
      profile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      categories
      yelpCategories {
        title
        alias
      }
      price
      reviewCount
      imageUrl
      rating
      createdAt
      shifts {
        nextToken
      }
      updatedAt
    }
  }
`;
export const deleteWorkplace = /* GraphQL */ `
  mutation DeleteWorkplace($id: ID!) {
    deleteWorkplace(id: $id)
  }
`;
export const createShift = /* GraphQL */ `
  mutation CreateShift($input: ShiftInput!) {
    createShift(input: $input) {
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
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      duty
      createdAt
      parentID
      alert
      updatedAt
    }
  }
`;
export const switchDuty = /* GraphQL */ `
  mutation SwitchDuty {
    switchDuty
  }
`;
export const deleteShiftEventsInFuture = /* GraphQL */ `
  mutation DeleteShiftEventsInFuture($input: ShiftEventDetailInput!) {
    deleteShiftEventsInFuture(input: $input)
  }
`;
export const deleteShiftEvent = /* GraphQL */ `
  mutation DeleteShiftEvent($input: ShiftEventDetailInput!) {
    deleteShiftEvent(input: $input)
  }
`;
export const updateShiftEventsInFuture = /* GraphQL */ `
  mutation UpdateShiftEventsInFuture($input: UpdateShiftEventInput!) {
    updateShiftEventsInFuture(input: $input) {
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
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      duty
      createdAt
      parentID
      alert
      updatedAt
    }
  }
`;
export const updateShiftEvent = /* GraphQL */ `
  mutation UpdateShiftEvent($input: UpdateOneShiftEventInput!) {
    updateShiftEvent(input: $input) {
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
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      duty
      createdAt
      parentID
      alert
      updatedAt
    }
  }
`;
export const favoriteVenue = /* GraphQL */ `
  mutation FavoriteVenue($input: VenueDetailInput!) {
    favoriteVenue(input: $input)
  }
`;
export const unfavoriteVenue = /* GraphQL */ `
  mutation UnfavoriteVenue($input: VenueDetailInput!) {
    unfavoriteVenue(input: $input)
  }
`;
export const createStaffRecentView = /* GraphQL */ `
  mutation CreateStaffRecentView($input: CreateStaffRecentViewInput!) {
    createStaffRecentView(input: $input)
  }
`;
export const clearStaffRecentView = /* GraphQL */ `
  mutation ClearStaffRecentView {
    clearStaffRecentView
  }
`;
export const createExploreRecentSearch = /* GraphQL */ `
  mutation CreateExploreRecentSearch($input: ExploreRecentSearchInput!) {
    createExploreRecentSearch(input: $input)
  }
`;
export const clearExploreRecentSearch = /* GraphQL */ `
  mutation ClearExploreRecentSearch {
    clearExploreRecentSearch
  }
`;
export const requestSitWithMe = /* GraphQL */ `
  mutation RequestSitWithMe($input: RequestSitWithMeInput!) {
    requestSitWithMe(input: $input) {
      staffID
      staffProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      staffProfileConnection {
        userName
        firstName
        lastName
      }
      patronID
      patronProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      patronProfileConnection {
        userName
        firstName
        lastName
      }
      confirmedAt
      createdAt
      updatedAt
    }
  }
`;
export const acceptSitWithMeRequest = /* GraphQL */ `
  mutation AcceptSitWithMeRequest($input: AcceptSitWithMeRequestInput!) {
    acceptSitWithMeRequest(input: $input) {
      staffID
      staffProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      staffProfileConnection {
        userName
        firstName
        lastName
      }
      patronID
      patronProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      patronProfileConnection {
        userName
        firstName
        lastName
      }
      confirmedAt
      createdAt
      updatedAt
    }
  }
`;
export const rejectSitWithMeRequest = /* GraphQL */ `
  mutation RejectSitWithMeRequest($input: RejectSitWithMeRequestInput!) {
    rejectSitWithMeRequest(input: $input) {
      staffID
      staffProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      staffProfileConnection {
        userName
        firstName
        lastName
      }
      patronID
      patronProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      patronProfileConnection {
        userName
        firstName
        lastName
      }
      confirmedAt
      createdAt
      updatedAt
    }
  }
`;
export const leaveTable = /* GraphQL */ `
  mutation LeaveTable($input: LeaveTableInput!) {
    leaveTable(input: $input) {
      staffID
      staffProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      staffProfileConnection {
        userName
        firstName
        lastName
      }
      patronID
      patronProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      patronProfileConnection {
        userName
        firstName
        lastName
      }
      confirmedAt
      createdAt
      updatedAt
    }
  }
`;
export const sendMessage = /* GraphQL */ `
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
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
      messageDetail {
        messageType
        text
        fileUrl
      }
      senderProfileID
      senderProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      createdAt
      sentFromConversationID
      updatedAt
    }
  }
`;
export const createMessage = /* GraphQL */ `
  mutation CreateMessage($input: CreateMessageInput!) {
    createMessage(input: $input) {
      id
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
      messageDetail {
        messageType
        text
        fileUrl
      }
      senderProfileID
      senderProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      createdAt
      sentFromConversationID
      updatedAt
    }
  }
`;
export const deleteConversation = /* GraphQL */ `
  mutation DeleteConversation($input: DeleteConversationInput!) {
    deleteConversation(input: $input)
  }
`;
export const markAsReadConversation = /* GraphQL */ `
  mutation MarkAsReadConversation($input: MarkAsReadConversationInput!) {
    markAsReadConversation(input: $input)
  }
`;
export const markAsUnreadConversation = /* GraphQL */ `
  mutation MarkAsUnreadConversation($input: MarkAsUnreadConversationInput!) {
    markAsUnreadConversation(input: $input)
  }
`;
export const muteConversation = /* GraphQL */ `
  mutation MuteConversation($input: MuteConversationInput!) {
    muteConversation(input: $input)
  }
`;
export const ignoreConversation = /* GraphQL */ `
  mutation IgnoreConversation($input: IgnoreConversationInput!) {
    ignoreConversation(input: $input)
  }
`;
export const unignoreConversation = /* GraphQL */ `
  mutation UnignoreConversation($input: UnignoreConversationInput!) {
    unignoreConversation(input: $input)
  }
`;
export const blockConversation = /* GraphQL */ `
  mutation BlockConversation($input: BlockConversationInput!) {
    blockConversation(input: $input)
  }
`;
export const unblockConversation = /* GraphQL */ `
  mutation UnblockConversation($input: UnblockConversationInput!) {
    unblockConversation(input: $input)
  }
`;
export const createBroadcastConversation = /* GraphQL */ `
  mutation CreateBroadcastConversation(
    $input: CreateBroadcastConversationInput!
  ) {
    createBroadcastConversation(input: $input) {
      id
      creatorProfileID
      creatorProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
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
export const createBroadcastMessage = /* GraphQL */ `
  mutation CreateBroadcastMessage($input: CreateBroadcastMessageInput!) {
    createBroadcastMessage(input: $input) {
      id
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
      messageDetail {
        messageType
        text
        fileUrl
      }
      senderProfileID
      senderProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      createdAt
      sentFromConversationID
      updatedAt
    }
  }
`;
export const updateBroadcastConversation = /* GraphQL */ `
  mutation UpdateBroadcastConversation(
    $input: UpdateBroadcastConversationInput!
  ) {
    updateBroadcastConversation(input: $input) {
      id
      creatorProfileID
      creatorProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
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
export const deleteBroadcastConversation = /* GraphQL */ `
  mutation DeleteBroadcastConversation(
    $input: DeleteBroadcastConversationInput!
  ) {
    deleteBroadcastConversation(input: $input) {
      id
      creatorProfileID
      creatorProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
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
export const createPatronsInBroadcastConversation = /* GraphQL */ `
  mutation CreatePatronsInBroadcastConversation(
    $input: CreatePatronsInBroadcastConversationInput!
  ) {
    createPatronsInBroadcastConversation(input: $input)
  }
`;
export const updatePatronsInBroadcastConversation = /* GraphQL */ `
  mutation UpdatePatronsInBroadcastConversation(
    $input: UpdatePatronsInBroadcastConversationInput!
  ) {
    updatePatronsInBroadcastConversation(input: $input)
  }
`;
export const deletePatronInBroadcastConversation = /* GraphQL */ `
  mutation DeletePatronInBroadcastConversation(
    $input: DeletePatronInBroadcastConversationInput!
  ) {
    deletePatronInBroadcastConversation(input: $input)
  }
`;
export const deleteNotification = /* GraphQL */ `
  mutation DeleteNotification($input: DeleteNotificationInput!) {
    deleteNotification(input: $input) {
      id
      kind
      recipientProfileID
      recipientProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
        blockedProfileIDs
        privacy
        memberShip
        presenceStatus
        lastOnlineAt
        createdAt
        updatedAt
      }
      senderProfileID
      senderProfile {
        id
        bio
        duty

        role
        userID
        avatarID
        onboardingStep
        completedAt
        followingStatus
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
      shiftID
      shift {
        id
        jobID
        start
        end
        workplaceID
        profileID
        duty
        createdAt
        parentID
        alert
        updatedAt
      }
      shiftAlert
      shiftWorkplaceName
      read
      readKind
      createdAt
      eventUpdatedAt
      updatedAt
    }
  }
`;
export const updateProfileNotificationSetting = /* GraphQL */ `
  mutation UpdateProfileNotificationSetting(
    $input: NotificationSettingsInput!
  ) {
    updateProfileNotificationSetting(input: $input) {
      muteMessage
      muteSWMRequest
      muteAll
    }
  }
`;
export const markReadNotifications = /* GraphQL */ `
  mutation MarkReadNotifications($input: MarkReadNotificationsInput!) {
    markReadNotifications(input: $input)
  }
`;
export const validateReceipt = /* GraphQL */ `
  mutation ValidateReceipt($input: ReceiptInput!) {
    validateReceipt(input: $input)
  }
`;
export const pushMessageNotification = /* GraphQL */ `
  mutation PushMessageNotification($input: MessageNotificationInput!) {
    pushMessageNotification(input: $input) {
      id
      profileID
      conversationID
      conversationType
      messageFrom {
        profileID
        userName
        firstName
        lastName
        avatarUrl
      }
      broadcastName
      messageDetail {
        messageType
        text
        fileUrl
      }
      sentAt
    }
  }
`;
export const conversationCreated = /* GraphQL */ `
  mutation ConversationCreated($input: MessageNotificationInput!) {
    conversationCreated(input: $input) {
      id
      profileID
      conversationID
      conversationType
      messageFrom {
        profileID
        userName
        firstName
        lastName
        avatarUrl
      }
      broadcastName
      messageDetail {
        messageType
        text
        fileUrl
      }
      sentAt
    }
  }
`;
export const profilePresenceStatus = /* GraphQL */ `
  mutation ProfilePresenceStatus($input: ProfilePresenceNotificationInput!) {
    profilePresenceStatus(input: $input) {
      id
      presenceStatus
      lastOnlineAt
      recipientProfileID
    }
  }
`;
export const notifyStaffShiftAlarmBeforeStart = /* GraphQL */ `
  mutation NotifyStaffShiftAlarmBeforeStart(
    $input: StaffShiftAlarmBeforeStartInput!
  ) {
    notifyStaffShiftAlarmBeforeStart(input: $input) {
      id
      kind
      recipientProfileID
      shiftID
      shift {
        alert
      }
    }
  }
`;
export const notifyPatronShiftAlarmBeforeStart = /* GraphQL */ `
  mutation NotifyPatronShiftAlarmBeforeStart(
    $input: PatronShiftAlarmBeforeStartInput!
  ) {
    notifyPatronShiftAlarmBeforeStart(input: $input) {
      id
      kind
      recipientProfileID
      senderProfileID
      shiftID
      shift {
        alert
      }
    }
  }
`;
export const notifyRequestSWM = /* GraphQL */ `
  mutation NotifyRequestSWM($input: NotifyRequestSWMInput!) {
    notifyRequestSWM(input: $input) {
      id
      kind
      recipientProfileID
      senderProfileID
    }
  }
`;
export const notifyAcceptRequestSWM = /* GraphQL */ `
  mutation NotifyAcceptRequestSWM($input: NotifyAcceptRequestSWMInput!) {
    notifyAcceptRequestSWM(input: $input) {
      id
      kind
      recipientProfileID
      senderProfileID
    }
  }
`;
export const notifyDirectMessage = /* GraphQL */ `
  mutation NotifyDirectMessage($input: NotifyDirectMessageInput!) {
    notifyDirectMessage(input: $input) {
      id
      kind
      recipientProfileID
      senderProfileID
    }
  }
`;
export const notifyProfileConversationUpdated = /* GraphQL */ `
  mutation NotifyProfileConversationUpdated(
    $input: ProfileConversationUpdatedInput!
  ) {
    notifyProfileConversationUpdated(input: $input) {
      recipientProfileID
      conversationID
      hide
      block
      blockedByProfileID
    }
  }
`;
export const notifyLeaveTable = /* GraphQL */ `
  mutation NotifyLeaveTable($input: NotifyLeaveTableInput!) {
    notifyLeaveTable(input: $input) {
      recipientProfileID
      leaveTableProfileID
      totalSittingWith
    }
  }
`;
export const notifyBlockProfile = /* GraphQL */ `
  mutation NotifyBlockProfile($input: NotifyBlockProfileInput!) {
    notifyBlockProfile(input: $input) {
      recipientProfileID
      profileID
    }
  }
`;
export const notifyReportProfile = /* GraphQL */ `
  mutation NotifyReportProfile($input: NotifyReportProfileInput!) {
    notifyReportProfile(input: $input) {
      recipientUserID
      profileID
      reportedProfileID
    }
  }
`;
export const deleteJob = /* GraphQL */ `
  mutation DeleteJob($input: DeleteJobInput!) {
    deleteJob(input: $input)
  }
`;
export const enableUser = /* GraphQL */ `
  mutation EnableUser($input: UserIdentifyInput!) {
    enableUser(input: $input)
  }
`;
export const disableUser = /* GraphQL */ `
  mutation DisableUser($input: UserIdentifyInput!) {
    disableUser(input: $input)
  }
`;
export const createJob = /* GraphQL */ `
  mutation CreateJob(
    $input: CreateJobInput!
    $condition: ModelJobConditionInput
  ) {
    createJob(input: $input, condition: $condition) {
      id
      name
      type
      priority
      createdAt
      updatedAt
    }
  }
`;
export const updateJob = /* GraphQL */ `
  mutation UpdateJob(
    $input: UpdateJobInput!
    $condition: ModelJobConditionInput
  ) {
    updateJob(input: $input, condition: $condition) {
      id
      name
      type
      priority
      createdAt
      updatedAt
    }
  }
`;
export const createUserDeviceToken = /* GraphQL */ `
  mutation CreateUserDeviceToken(
    $input: CreateUserDeviceTokenInput!
    $condition: ModelUserDeviceTokenConditionInput
  ) {
    createUserDeviceToken(input: $input, condition: $condition) {
      userID
      deviceToken
      createdAt
      updatedAt
    }
  }
`;
export const attachConnectPolicy = /* GraphQL */ `
  mutation AttachConnectPolicy($input: AttachConnectPolicyInput!) {
    attachConnectPolicy(input: $input)
  }
`;


export const updateReportedProfile = /* GraphQL */ `
  mutation updateReportedProfile($input: UpdateReportedProfileInput!, $condition: ModelReportedProfileConditionInput) {
    updateReportedProfile(input: $input, condition: $condition) {
      id
      status
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
  }
`;

export const updateAppVersion = /* GraphQL */ `
  mutation UpdateAppVersion(
    $input: UpdateAppVersionInput!
    $condition: ModelAppVersionConditionInput
  ) {
    updateAppVersion(input: $input, condition: $condition) {
      id
      forceUpdated
      currentAppVersion
    }
  }
`;
