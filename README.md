### Prereqs

* Node.js v12.x or later

### How do I get set up?

* Install Amplify cli: `npm install -g @aws-amplify/cli@6.3.1`
* Install Amplify Plugin:
  + `npm install -g amplify-category-video`
  + `npm install -g graphql-ttl-transformer`
* Add AWS profile:
  + `cd ~`
  + `mkdir -p .aws`
  + `vi .aws/config`

add the following to the end of file:
```
[profile amplify-sitwithme-dev]
region=us-east-2
```

  + `vi .aws/credentials`

and add the following:
```
[amplify-sitwithme-dev]
aws_access_key_id=********************
aws_secret_access_key=********************
```


In the project directory, you can run:

* `amplify init`

Follow the instructions
Do you want to use an existing environment? (Y/n)   --> Y
Choose the environment you would like to use:       --> dev
Choose your default editor:                         --> any
Do you want to use an AWS profile? (Y/n)            --> Y
Please choose the profile you want to use           --> amplify-sitwithme-dev

Install node modules
* `yarn install`

Mock api locally
* `amplify mock api`
* `yarn dev sitwithmeShift` for building sitwithmeShift function for testing

Run admin
* `yarn start`

Userfull commands
* `amplify codegen configure`
* `amplify env dev pull --restore`

### Manual config

AWS Amplify doesn't automate fully, so we have some tasks must be done manually

1. Config Apple Sign In
2. Mapping Cognito Triggers
3. Setting Environment Variable on AWS Amplify Console
4. Mapping domain to Cloudfront (assets)
5. Mapping domain for Admin dashboard
6. Lambda Edge only support at us-east-1 region so we need to clone Lambda Edge from us-east-2 to us-east-1 and mapping lambda edge (sitwithmeImageResize) for cloudfront: `event: origin-response`
  - Ref: https://aws.amazon.com/premiumsupport/knowledge-center/lambda-function-migration-console
  - Config: RAM: 256, timeout: 30s
  - Config role same as the original lambda function, allow log with resource: `*`, and allow `edgelambda.amazonaws.com` assume role
7. Index Geolocation for AWS Elasticsearch: Read file `ESConfig.md`
8. Config Pinpoint + Firebase + SES for handle bounces and complaints
9. Config Apple IAP and webhook
10. Config Thumbnail generate for video
11. Trigger Lambda migration if needed after deployment

### iOS development

* Add AWS profile:
  + `cd ~`
  + `mkdir -p .aws`
  + `vi .aws/config`

add the following to the end of file:
```
[profile amplify-sitwithme-fe]
region=us-east-2
```

  + `vi .aws/credentials`

and add the following:
```
[amplify-sitwithme-fe]
aws_access_key_id=********************
aws_secret_access_key=********************
```

- `cd <backend-code-path>`
- `mkdir -p ios && cd ios`
- `amplify pull`

Follow the instructions

Please choose the profile you want to use       --> amplify-sitwithme-fe
Which app are you working on?                   --> d10z8aa9yi32g8
Pick a backend environment                      --> dev
Choose your default editor                      --> any
Choose the type of app that you're building     --> ios
Do you plan on modifying this backend?          --> Yes

And 2 files `amplifyconfiguration.json` and `awsconfiguration.json` are updated in the repo.

- `amplify codegen models`

### Testing

#### Unit testing

- `yarn run unit-test` add `--silent=false` if you want to show logging


### Re-index on OpenSearch

```
cd scripts
python ddb_to_es.py \
 --rn 'us-east-2' \
 --tn 'User-k6mw73tsx5cjppsd7cx3oi2yx4-dev' \
 --lf 'arn:aws:lambda:us-east-2:937833379153:function:DdbToEsFn-k6mw73tsx5cjppsd7cx3oi2yx4-dev' \
 --esarn 'arn:aws:dynamodb:us-east-2:937833379153:table/User-k6mw73tsx5cjppsd7cx3oi2yx4-dev/stream/2021-06-22T07:34:27.517'
```
