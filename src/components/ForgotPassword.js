import React, { useState } from "react";
import { Link } from "ra-ui-materialui";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import CardActions from "@material-ui/core/CardActions";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Field, Form } from "react-final-form";
import Button from "@material-ui/core/Button";
import { useNotify, useRedirect, useSafeSetState, useTranslate } from "ra-core";
import { Notification } from 'react-admin';
import { Auth } from 'aws-amplify';

const useStyles = makeStyles(
  (theme) => ({
    container: {
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      backgroundImage: 'radial-gradient(circle at 50% 14em, #313264 0%, #00023b 60%, #00023b 100%)'
    },
    link: {
      fontSize: '0.8em',
      flexGrow: 2,
      textAlign: 'right'
    },
    formHeaderText: {
      fontSize: '0.9em'
    },
    formContainer: {
      backgroundColor: '#fff',
      marginTop: '6em',
      boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      borderRadius: '4px',
      color: 'rgba(0,0,0,0.87)',
      transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms'
    },
    form: {
      padding: "0 1em 1em 1em",
      width: '300px'
    },
    input: {
      marginTop: "1em",
    },
    icon: {
      marginRight: theme.spacing(1),
    },
  }),
  { name: "RaForgotPasswordForm" }
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

export const ForgotPassword = ({ staticContext, ...props }) => {
  const classes = useStyles(props);
  const translate = useTranslate();
  const notify = useNotify();
  const [loading, setLoading] = useSafeSetState(false);
  const [displayNewPasswordForm, SetDisplayNewPasswordForm] = useState(false);
  const [email, setEmail] = useState("");
  const redirect = useRedirect();

  const validate = (values) => {
    const errors = {};

    if (displayNewPasswordForm) {
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
    } else {
      if (!values.email) {
        errors.email = translate("ra.validation.required");
      }
    }

    return errors;
  };

  const submit = async (values, form) => {
    setLoading(true);
    try {
      if (!displayNewPasswordForm) {
        await Auth.forgotPassword(values.email);
        setEmail(values.email);
        notify('ra.notification.forgot_pw_succeeded');
        SetDisplayNewPasswordForm(true);
      } else {
        await Auth.forgotPasswordSubmit(email, values.verificationCode, values.newPassword);
        notify('ra.notification.change_pw_succeeded');
        redirect('/login');
      }

    } catch (err) {
      let msg = 'ra.notification.unknown_error';
      if (err.code === 'InvalidPasswordException') {
        msg = translate("ra.validation.pw_rule", { min: 6 });
      } else if (err.code === 'LimitExceededException') {
        msg = 'ra.user.cognito_limit_error';
      } else {
        if (err.message) {
          msg = err.message;
        }
      }
      notify(msg, "warning");
    } finally {
      setLoading(false);
    }
  };

  const emailInput = () => {
    return (
      <>
        <p className={classes.formHeaderText}>Please enter your email and we'll send you a verification code to reset your password.</p>
        <div className={classes.input}>
          <Field
            id="email"
            name="email"
            component={Input}
            label={translate("ra.auth.email")}
            disabled={loading}
            type="email"
          />
        </div>
      </>
    );
  };

  const newPasswordInput = () => {
    return (
      <>
        <p className={classes.formHeaderText}>Please enter your new password with the verification code.</p>
        <div className={classes.input}>
          <Field
            id="newPassword"
            name="newPassword"
            component={Input}
            type="password"
            label={translate("ra.auth.new_password")}
            disabled={loading}
          />
        </div>
        <div className={classes.input}>
          <Field
            id="newPasswordConfirmation"
            name="newPasswordConfirmation"
            component={Input}
            type="password"
            label={translate("ra.auth.new_password_confirmation")}
            disabled={loading}
          />
        </div>
        <div className={classes.input}>
          <Field
            id="verificationCode"
            name="verificationCode"
            component={Input}
            label={translate("ra.auth.verification_code")}
            disabled={loading}
          />
        </div>
      </>
    );
  };

  return (
    <div className={classes.container}>
      <Notification />
      <Form
        onSubmit={submit}
        validate={validate}
        render={({ handleSubmit, form }) => (
          <form onSubmit={handleSubmit} className={classes.formContainer}>
            <div className={classes.form}>
              {displayNewPasswordForm ? newPasswordInput() : emailInput()}
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
                {translate(displayNewPasswordForm ? "ra.action.update" : "ra.action.continue")}
              </Button>
              {displayNewPasswordForm ? '' : <Link className={classes.link} to="/login">Back to login</Link>}
            </CardActions>
          </form>
        )}
      />
    </div>
  );
};
