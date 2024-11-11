import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import CardActions from "@material-ui/core/CardActions";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Field, Form } from "react-final-form";
import Button from "@material-ui/core/Button";
import { useNotify, useSafeSetState, useTranslate } from "ra-core";
import { Auth } from 'aws-amplify';

const useStyles = makeStyles(
  (theme) => ({
    form: {
      padding: "0 1em 1em 1em",
      width: '300px',
    },
    input: {
      marginTop: "1em",
    },
    icon: {
      marginRight: theme.spacing(1),
    },
  }),
  { name: "RaChangePasswordForm" }
);

const Input = ({ meta: { touched, error }, input: inputProps, ...props }) => (
  <TextField
    error={!!(touched && error)}
    helperText={touched && error}
    {...inputProps}
    {...props}
    fullWidth
  />
);

const validatePassword = (pw) => {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
  return re.test(pw);
};

export const ChangePassword = ({ staticContext, ...props }) => {
  const classes = useStyles(props);
  const translate = useTranslate();
  const notify = useNotify();
  const [loading, setLoading] = useSafeSetState(false);

  const validate = (values) => {
    const errors = {};

    if (!values.currentPassword) {
      errors.currentPassword = translate("ra.validation.required");
    }

    if (!values.newPassword) {
      errors.newPassword = translate("ra.validation.required");
    } else {
      const minLength = 6;
      if (values.newPassword.length && !validatePassword(values.newPassword)) {
        errors.newPassword = translate("ra.validation.pw_rule", { min: minLength });
      } else if (values.newPassword !== values.newPasswordConfirmation) {
        errors.newPasswordConfirmation = translate("ra.validation.confirmation", { field: 'Password' });
      }
    }

    if (!values.newPasswordConfirmation) {
      errors.newPasswordConfirmation = translate("ra.validation.required");
    }

    return errors;
  };

  const submit = async (values, form) => {
    setLoading(true);
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(user, values.currentPassword, values.newPassword);
      notify('ra.notification.update_succeeded');

      // reset form
      Object.keys(values).forEach(key => {
        form.change(key, undefined);
        form.resetFieldState(key);
      });
    } catch (err) {
      let msg = 'ra.notification.unknown_error';
      if (err.code === 'NotAuthorizedException') {
        msg = 'ra.user.current_password_error';
      } else if (err.code === 'LimitExceededException') {
        msg = 'ra.user.cognito_limit_error';
      } else if (err.code === 'InvalidPasswordException') {
        msg = translate("ra.validation.pw_rule", { min: 6 });
      }
      notify(msg, "warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      onSubmit={submit}
      validate={validate}
      render={({ handleSubmit, form }) => (
        <form onSubmit={handleSubmit} noValidate>
          <div className={classes.form}>
            <div className={classes.input}>
              <Field
                id="currentPassword"
                name="currentPassword"
                component={Input}
                label={translate("ra.user.current_password")}
                type="password"
                disabled={loading}
              />
            </div>
            <div className={classes.input}>
              <Field
                id="newPassword"
                name="newPassword"
                component={Input}
                label={translate("ra.user.new_password")}
                type="password"
                disabled={loading}
              />
            </div>
            <div className={classes.input}>
              <Field
                id="newPasswordConfirmation"
                name="newPasswordConfirmation"
                component={Input}
                type="password"
                label={translate("ra.user.new_password_confirmation")}
                disabled={loading}
              />
            </div>
          </div>
          <CardActions>
            <Button
              variant="contained"
              type="submit"
              color="primary"
              disabled={loading}
            >
              {loading && (
                <CircularProgress
                  className={classes.icon}
                  size={18}
                  thickness={2}
                />
              )}
              {translate("ra.action.update")}
            </Button>
          </CardActions>
        </form>
      )}
    />
  );
};
