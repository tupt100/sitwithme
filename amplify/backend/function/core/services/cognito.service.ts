import { CognitoUpdateUserAttributes } from '@swm-core/interfaces/cognito.interface';
import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';

export class CognitoService {
  cognitoIdentityServiceProvider: CognitoIdentityServiceProvider;
  constructor() {
    this.cognitoIdentityServiceProvider = new CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
  }

  async updateUserAttributes(
    cognitoUserAttributes: { Name: string, Value: string }[],
    cognitoParams: CognitoUpdateUserAttributes,
  ) {
    return this.cognitoIdentityServiceProvider.adminUpdateUserAttributes({
      UserAttributes: cognitoUserAttributes,
      UserPoolId: cognitoParams.userPoolId,
      Username: cognitoParams.userName,
    }).promise();
  }

  async listUsersByUserName(userPoolId: string, userName: string) {
    return this.cognitoIdentityServiceProvider.listUsers({
      UserPoolId: userPoolId,
      Filter: `preferred_username = "${userName?.trim()}"`
    }).promise();
  }

  async getUserByUserName(userPoolId: string, userName: string) {
    const listUsers = await this.listUsersByUserName(userPoolId, userName);
    let existedUser = listUsers.Users
      .find((user: { [key: string]: any }) =>
        user.Attributes?.find(item => item.Name === 'preferred_username')?.Value === userName
      );
    return existedUser;
  }

  async listUsersByEmail(userPoolId: string, email: string) {
    return this.cognitoIdentityServiceProvider.listUsers({
      UserPoolId: userPoolId,
      Filter: `email = "${email?.toLowerCase().trim()}"`
    }).promise();
  }

  async findUserByEmail(userPoolId: string, email: string) {
    const cognitoUser = await this.listUsersByEmail(userPoolId, email);
    if (cognitoUser.Users?.length) {
      return cognitoUser.Users[0];
    }
  }

  async adminDisableUser(params: CognitoIdentityServiceProvider.AdminDisableUserRequest): Promise<CognitoIdentityServiceProvider.AdminDisableUserResponse> {
    return this.cognitoIdentityServiceProvider.adminDisableUser(params).promise();
  }

  async adminEnableUser(params: CognitoIdentityServiceProvider.AdminEnableUserRequest): Promise<CognitoIdentityServiceProvider.AdminEnableUserResponse> {
    return this.cognitoIdentityServiceProvider.adminEnableUser(params).promise();
  }

  async adminDeleteUser(params: CognitoIdentityServiceProvider.AdminDeleteUserRequest) {
    return this.cognitoIdentityServiceProvider.adminDeleteUser(params).promise();
  }

  async confirmSignUp(params: CognitoIdentityServiceProvider.AdminConfirmSignUpRequest): Promise<CognitoIdentityServiceProvider.AdminConfirmSignUpResponse> {
    return this.cognitoIdentityServiceProvider.adminConfirmSignUp(params).promise();
  }
}
