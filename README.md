# Stream Monitor

Super basic express app for monitoring/visualizing many (possibly inter-related) kinesis streams

## Setup

```
npm install
pip install awscli
aws configure
AWS Access Key ID [None]: xxx
AWS Secret Access Key [None]: xxx
Default region name [None]: us-east-1
Default output format [None]: json
```

## Configure streams

In `config/default.json` list the streams to monitor

## Run locally

```
node app.js
```

And visit `localhost:3000`
