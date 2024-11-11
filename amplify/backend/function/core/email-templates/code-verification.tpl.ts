const subject = '[SitWithMe] Your verification code';

const bodyHtml = (code: string) => {
  return `<html>
  <head></head>
  <body>
    <p>Your verification code is ${code}</p>
  </body>
  </html>`;
};

const bodyText = (code: string) => {
  return `Your verification code is ${code}`;
};

export const buildCodeVerificationEmail = (code: string) => {
  return {
    subject,
    bodyHTML: bodyHtml(code),
    bodyText: bodyText(code)
  };
};
