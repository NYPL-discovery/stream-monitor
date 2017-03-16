const avro = require('avsc');
const fs = require('fs');

const avroSchema = {
  "name": "Sample",
  "type": "record",
  "fields": [
    {"name": "trackingId", "type": "string"},
    {"name": "number", "type": "float"}
  ]
};
const outfile = 'event.json';
const avroType = avro.parse(avroSchema);

// encode data and put in kinesis format
var kinesisEncodedData = [128, 256, 512, 1024, 2048]
  .map(function(n){
    return {
      number: n,
      trackingId: guid()
    }
  })
  .map(function(record){
    return kinesify(record, avroType);
  });

// unique key
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

// stringify and write to file
var json = JSON.stringify({"Records": kinesisEncodedData}, null, 2);
fs.writeFile(outfile, json, 'utf8', function(err, data){
  if (err) {
    console.log('Write error:', err);

  } else {
    console.log('Successfully wrote data to file');
  }
});


function kinesify(record, avroType){
  // encode avro
  var buf = avroType.toBuffer(record);
  // encode base64
  var encoded = buf.toString('base64');
  // kinesis format
  return {
    "kinesis": {
      "kinesisSchemaVersion": "1.0",
      "partitionKey": "s1",
      "sequenceNumber": "00000000000000000000000000000000000000000000000000000001",
      "data": encoded,
      "approximateArrivalTimestamp": 1428537600
    },
    "eventSource": "aws:kinesis",
    "eventVersion": "1.0",
    "eventID": "shardId-000000000000:00000000000000000000000000000000000000000000000000000001",
    "eventName": "aws:kinesis:record",
    "invokeIdentityArn": "arn:aws:iam::EXAMPLE",
    "awsRegion": "us-east-1",
    "eventSourceARN": "arn:aws:kinesis:EXAMPLE"
  };
}
