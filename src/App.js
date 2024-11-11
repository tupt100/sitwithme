import { Amplify } from "@aws-amplify/core";
import React from "react";
import { Route } from 'react-router-dom';
import { Admin, Resource } from "react-admin";
import UserIcon from '@material-ui/icons/People';
import JobIcon from '@material-ui/icons/Work';
import ReportIcon from '@material-ui/icons/Report';
import GetApp from '@material-ui/icons/GetApp';
import { buildAuthProvider } from "./providers";
import englishMessages from './i18n/en';
import polyglotI18nProvider from 'ra-i18n-polyglot';
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { ChangePassword } from "./components/ChangePassword";
import { ForgotPassword } from "./components/ForgotPassword";
import MyLayout from './layouts/MyLayout';

import awsExports from "./aws-exports";
import dataProvider from './AppDataProvider';

import {
  JobCreate,
  JobEdit,
  JobList,
  JobShow,
} from "./components/Job";
import {
  ReportedProfileList
} from "./components/ReportedProfile";
import {
  AppVersionList,
  AppVersionEdit
} from "./components/AppVersion";
import {
  UserList,
  UserShow,
} from "./components/User";
import {
  FollowingReportList
} from './components/FollowingReport';


Amplify.configure(awsExports);

const authProvider = buildAuthProvider({
  authGroups: ["admin"],
});

const messages = {
  'en': englishMessages,
};

const i18nProvider = polyglotI18nProvider(locale => messages[locale]);

function App() {
  return (
    <Admin
      authProvider={authProvider}
      dataProvider={dataProvider}
      i18nProvider={i18nProvider}
      loginPage={LoginPage}
      dashboard={Dashboard}
      layout={MyLayout}
      customRoutes={[
        <Route
            key="change-password"
            path="/change-password"
            component={ChangePassword}
        />,
        <Route
            key="forgot-password"
            path="/forgot-password"
            component={ForgotPassword}
            noLayout
        />
      ]}
    >
      {(permissions) => [
        <Resource
          name="users"
          icon={UserIcon}
          list={UserList}
          show={UserShow}
        />,
        <Resource
          name="jobs"
          icon={JobIcon}
          list={JobList}
          show={JobShow}
          edit={JobEdit}
          create={JobCreate}
        />,
        <Resource
          name="reportedProfiles"
          icon={ReportIcon}
          list={ReportedProfileList}
          options={{ label: 'Issues' }}
        />,
        <Resource
          name="followingReports"
          list={FollowingReportList}
          options={{ label: 'Following Report' }}
        />,
        <Resource
          name="appVersions"
          icon={GetApp}
          list={AppVersionList}
          edit={AppVersionEdit}
          options={{ label: 'App Version' }}
        />,
        <Resource name="profiles" />,
        <Resource name="photos" />
      ]}
    </Admin>
  );
}

export default App;
