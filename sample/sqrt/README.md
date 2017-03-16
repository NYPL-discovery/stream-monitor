# Sample Lambda

This is a simple lambda that listens to a kinesis stream, decodes the stream, takes the square root of the data, and posts it to another stream.

## Setup

```
npm install
npm install -g node-lambda
node-lambda setup
node mock-data.js
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

Update `deploy.env` with the appropriate Kinesis stream output name

```
node-lambda deploy --functionName streamMonitorTest1 --environment production --configFile deploy1.env
node-lambda deploy --functionName streamMonitorTest2 --environment production --configFile deploy2.env
```
