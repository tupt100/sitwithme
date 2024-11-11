import React, { useState } from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import CardActions from "@material-ui/core/CardActions";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Field, Form } from "react-final-form";
import { useLogin, useNotify, useSafeSetState, useTranslate } from "ra-core";
import { Link } from "ra-ui-materialui";

const useStyles = makeStyles(
  (theme) => ({
    form: {
      padding: "0 1em 1em 1em",
    },
    link: {
      fontSize: '0.8em',
      float: 'right'
    },
    clear: {
      clear: 'both'
    },
    input: {
      marginTop: "1em",
    },
    button: {
      width: "100%",
    },
    icon: {
      marginRight: theme.spacing(1),
    },
  }),
  { name: "RaLoginForm" }
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

let cognitoUser;

export const LoginForm = (props) => {
  const classes = useStyles(props);
  const { redirectTo } = props;
  const [loading, setLoading] = useSafeSetState(false);
  const login = useLogin();
  const translate = useTranslate();
  const notify = useNotify();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayNewPasswordForm, SetDisplayNewPasswordForm] = useState(false);

  const validate = (values) => {
    const errors = { username: undefined, password: undefined };

    if (!values.username) {
      errors.username = translate("ra.validation.required");
    }
    if (!values.password) {
      errors.password = translate("ra.validation.required");
    }

    if (displayNewPasswordForm) {
      if (!values.newPassword) {
        errors.newPassword = translate("ra.validation.required");
      } else {
        const minLength = 6;
        if (values.newPassword.length < minLength) {
          errors.newPassword = translate("ra.validation.minLength", { min: minLength });
        } else if (values.newPassword !== values.newPasswordConfirmation) {
          errors.newPasswordConfirmation = translate("ra.validation.confirmation", { field: 'Password' });
        }
      }
    }
    return errors;
  };

  const submit = (values) => {
    setLoading(true);
    if (cognitoUser) {
      values.user = cognitoUser;
    }

    login(values, redirectTo)
      .then(() => {
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);

        if (error && error.name === 'NewPasswordRequiredError') {
          cognitoUser = error.user;
          SetDisplayNewPasswordForm(true);
        } else {
          let msg;
          if (typeof error === "string") {
            msg = error;
          } else if (typeof error === "undefined" || !error.message) {
            msg = "ra.auth.sign_in_error";
          } else {
            msg = error.message.replace('username', 'email');
          }
          notify(msg, "warning");
        }
      });
  };

  const signInInput = () => {
    return (
      <>
        <div className={classes.input}>
          <Field
            id="username"
            name="username"
            component={Input}
            label={translate("ra.auth.email")}
            disabled={loading}
          />
        </div>
        <div className={classes.input}>
          <Field
            id="password"
            name="password"
            component={Input}
            label={translate("ra.auth.password")}
            type="password"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
        <div className={classes.input}>
          <Link className={classes.link} to="/forgot-password">Forgot password?</Link>
          <p className={classes.clear}></p>
        </div>
      </>
    );
  };

  const newPasswordInput = () => {
    return (
      <>
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
      </>
    );
  };

  return (
    <Form
      onSubmit={submit}
      validate={validate}
      initialValues={{
        username: username,
        password: password,
      }}
      render={({ handleSubmit }) => (
        <form onSubmit={handleSubmit} noValidate>
          <div className={classes.form}>
          {displayNewPasswordForm ? newPasswordInput() : signInInput()}
          </div>
          <CardActions>
            <Button
              variant="contained"
              type="submit"
              color="primary"
              disabled={loading}
              className={classes.button}
            >
              {loading && (
                <CircularProgress
                  className={classes.icon}
                  size={18}
                  thickness={2}
                />
              )}
              {translate("ra.auth.sign_in")}
            </Button>
          </CardActions>
        </form>
      )}
    />
  );
};

LoginForm.propTypes = {
  redirectTo: PropTypes.string,
};