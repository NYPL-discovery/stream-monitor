# Sample Lambda Seeder

This is a simple lambda that seeds a kinesis stream to be used subsequently with the sqrt lambdas in the sample directory

## Setup

```
npm install
npm install -g node-lambda
node-lambda setup
```

## Configure

In `.env` set at least these parameters

```
KINESIS_STREAM_NAME_OUT=xxx
AWS_ENVIRONMENT=development
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

## Run locally

```
node-lambda run
```

## Deploy

```
node-lambda deploy --functionName streamMonitorTestSeed
```
