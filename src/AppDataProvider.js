import { buildDataProvider } from "./providers";
import awsExports from "./aws-exports";
import * as mutations from "./graphql/mutations";
import * as queries from "./graphql/queries";
import * as subscriptions from "./graphql/subscriptions";

const dataProvider = buildDataProvider(
  {
    queries,
    mutations,
    subscriptions
  },
  {
    storageBucket: awsExports.aws_user_files_s3_bucket,
    storageRegion: awsExports.aws_user_files_s3_bucket_region,
    enableAdminQueries: false,
  }
);

export default dataProvider;
