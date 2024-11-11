import { adminSite } from "@swm-core/constants/admin.const";

const {
  ENV,
} = process.env;

const reportProfileSubject = '[SitWithMe] New Issue reported';

const reportProfileHTML = (reporterEmail: string, reportedEmail: string, type: string, reason: string, createdAt: Date) => {
  return `<html>
  <head></head>
  <body>
    <h3>New Issue reported at <a href="${adminSite[ENV]}/#/reportedProfiles">Admin Dashboard</a></h3>
    <ul>
      <li>Reporter: ${reporterEmail}</li>
      <li>Reported: ${reportedEmail}</li>
      <li>Type: ${type}</li>
      ${ reason ? `<li>Reason: ${reason}</li>` : '' }
      <li>Created At: ${createdAt.toUTCString()}</li>
    </ul>
  </body>
  </html>`;
};

const reportProfileText = (reporterEmail: string, reportedEmail: string, type: string, reason: string, createdAt: Date) => {
  return `New Issue reported at "${adminSite[ENV]}/#/reportedProfiles"
-------------------------------------------------
- Reporter: ${reporterEmail}
- Reported: ${reportedEmail}
- Type: ${type}
${ reason ? `- Reason: ${reason}` : '' }
- Created At: ${createdAt.toUTCString()}`;
};

export const buildReportProfileEmail = (reporterEmail: string, reportedEmail: string, type: string, reason: string, createdAt: Date) => {
  return {
    subject: reportProfileSubject,
    bodyHTML: reportProfileHTML(reporterEmail, reportedEmail, type, reason, createdAt),
    bodyText: reportProfileText(reporterEmail, reportedEmail, type, reason, createdAt)
  };
};