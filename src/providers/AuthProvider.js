import { Auth } from "@aws-amplify/auth";
import appSubscriptions from '../AppSubscriptions';

const defaultOptions = {
  authGroups: [],
};

class NewPasswordRequiredError extends Error {
  constructor(message, user) {
    super(message);
    this.name = "NewPasswordRequiredError";
    this.user = user;
  }
}

export class AuthProvider {

  constructor(options) {
    this.authGroups = options.authGroups || defaultOptions.authGroups;
  }

  async login({
    username,
    password,
    newPassword,
    user,
    clientMetadata,
  }) {
    if (newPassword && user) {
      return Auth.completeNewPassword(user, newPassword);
    } else {
      const user = await Auth.signIn(
        username,
        password,
        clientMetadata
      );
      if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
        throw new NewPasswordRequiredError('NewPasswordRequiredError', user);
      }
      return user;
    }
  };

  logout = () => {
    // clean up subscriptions
    for (const key of Object.keys(appSubscriptions)) {
      if (appSubscriptions[key]) {
        console.log('unsubscribe', key);
        appSubscriptions[key].unsubscribe();
      }
    }

    return Auth.signOut();
  };

  checkAuth = async () => {
    const session = await Auth.currentSession();

    if (this.authGroups.length === 0) {
      return;
    }

    const userGroups = session.getAccessToken().decodePayload()[
      "cognito:groups"
    ];

    if (!userGroups) {
      throw new Error("Unauthorized");
    }

    for (const group of userGroups) {
      if (this.authGroups.includes(group)) {
        return;
      }
    }

    throw new Error("Unauthorized");
  };

  checkError = () => {
    return Promise.resolve();
  };

  getPermissions = async () => {
    try {
      const session = await Auth.currentSession();
      const groups = session.getAccessToken().decodePayload()["cognito:groups"];
      return groups ? Promise.resolve(groups) : Promise.resolve([]);
    } catch (e) {
      return Promise.resolve([]);
    }
  };
}
