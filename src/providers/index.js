import { AuthProvider } from "./AuthProvider";
import { DataProvider } from './DataProvider';

export function buildAuthProvider(options) {
  const authProvider = new AuthProvider(options);

  return {
    login: authProvider.login,
    logout: authProvider.logout,
    checkAuth: authProvider.checkAuth,
    checkError: authProvider.checkError,
    getPermissions: authProvider.getPermissions,
  };
}

export function buildDataProvider(operations, options) {
  const dataProvider = new DataProvider(operations, options);

  return dataProvider;
}
