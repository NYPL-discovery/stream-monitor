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
const kinesisConfig = {
  endpoint: 'kinesis.us-east-1.amazonaws.com',
  region: 'us-east-1'
};

exports.handler = function(event, context, callback) {
  var avroType = avro.parse(avroSchema);
  var kinesis = new aws.Kinesis();
  kinesis.config.region = kinesisConfig.region
  kinesis.config.endpoint = kinesisConfig.endpoint
  kinesis.region = kinesisConfig.region
  kinesis.endpoint = kinesisConfig.endpoint

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

  // create promises
  var promises = kinesisData.map(function(d){
    // randomly wait between 0-6 seconds, then post record
    var wait = Math.floor(Math.random() * 6000);
    return postRecord(d, wait);
  });

  // callback after promises are resolved
  Promise.all(promises).then(function(res){
    callback(null, data);
  },function(err){
    callback(err);
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
    var kinesisRecord = {
      'Data': entry,
      'PartitionKey': partitionKey,
      'StreamName': process.env['KINESIS_STREAM_NAME_OUT']
    }
    return kinesisRecord;
  }

  // post data to kinesis
  function postRecord(record, wait) {
    return new Promise(function (resolve, reject) {
      setTimeout(function(){
        kinesis.putRecord(record, function(err, data) {
          if (err) {
            console.log(err);
            reject(err);

          } else {
            resolve(data);
          }
        });
      }, wait);
    });
  }
};
