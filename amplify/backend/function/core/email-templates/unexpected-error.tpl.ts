const {
  ENV,
} = process.env;

const bodyHtml = (data: any, date: Date) => {
  return `<html>
  <head></head>
  <body>
    <h3>[SWM-${ENV}] Unexpected Error</h3>
    <p>Date: ${date.toUTCString()}</p>
    <p>Data: ${JSON.stringify(data)}</p>
  </body>
  </html>`;
};

const bodyText = (data: any, date: Date) => {
  return `[SWM-${ENV}] Unexpected Error
-------------------------------------------------
- Date: ${date.toUTCString()}
- Data: ${JSON.stringify(data)}`;
};

export const buildUnexpectedError = (data: any, date: Date, _subject: string = '') => {
  const subject = `[SWM-${ENV}] Unexpected Error ${_subject}`;
  return {
    subject,
    bodyHTML: bodyHtml(data, date),
    bodyText: bodyText(data, date)
  };
};
