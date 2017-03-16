const avro = require('avsc');
const aws = require('aws-sdk');
const Promise = require('promise');

const avroSchema = {
  "name": "Sample",
  "type": "record",
  "fields": [
    {"name": "trackingId", "type": "string"},
    {"name": "number", "type": "float"}
  ]
};

exports.handler = function(event, context, callback) {
  var avroType = avro.parse(avroSchema);

  // give seeds a tracking id
  var data = event.seeds
    .map(function(n){
      return {
        number: n,
        trackingId: guid()
      };
    })

  var kinesisData = data
    // avro encode it
    .map(function(d){
      return avroType.toBuffer(d);
    })
    // put it in kinesis format
    .map(kinesisify);

  // post data to stream
  postData(kinesisData).then(function(res){
    callback(null, data);
  });

  // unique partition key
  function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  // map to records objects to kinesis records
  function kinesisify(entry) {
    var partitionKey = 'pk-' + guid();
    var streamName = process.env['KINESIS_STREAM_NAME_OUT'];
    var kinesisRecord = {
      'Data': entry,
      'PartitionKey': partitionKey,
      'StreamName': streamName
    }
    return kinesisRecord;
  }

  // post data to kinesis
  function postData(records) {
    var kinesis = new aws.Kinesis();
    var promises = records.map(function(record){
      return postRecord(kinesis, record);
    })
    return Promise.all(promises);
  }

  function postRecord(kinesis, record){
    return new Promise(function (resolve, reject) {
      kinesis.putRecord(record, function(err, data) {
        resolve(data);
      });
    });
  }
};
