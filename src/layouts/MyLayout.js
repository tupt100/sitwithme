import React from 'react';
import { Auth } from 'aws-amplify';
import { Layout, Notification, useNotify } from 'react-admin';
import { makeStyles } from "@material-ui/core/styles";
import MyAppbar from './MyAppbar';
import dataProvider from '../AppDataProvider';
import appSubscriptions from '../AppSubscriptions';

const useStyles = makeStyles(
  (theme) => ({
    notification: {
      color: 'white'
    }
  }),
  { name: "RaNotification" }
);

const MyNotification = props => {
  const classes = useStyles(props);
  return (
    <Notification {...props} className={classes.notification} />
  );
};

const MyLayout = props => {
  const notify = useNotify();

  if (!appSubscriptions.onReportProfile) {
    Auth.currentAuthenticatedUser()
      .then((user) => {
        appSubscriptions.onReportProfile = dataProvider.subscribeOnReportProfile({ data: { recipientUserID: user.attributes['custom:id'] } })
          .subscribe(
          {
            next: (res) => {
              const { value } = res;
              const result = value.data.onReportProfile;
              if (result) {
                notify('There is a new issue reported!', 'success');
              }
            },
            error: (err) => console.warn(err)
          }
        );
      });
  }

  return (
    <Layout {...props} appBar={MyAppbar} notification={MyNotification} />
  );
};

export default MyLayout;
