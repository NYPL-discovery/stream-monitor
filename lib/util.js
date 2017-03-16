const avro = require('avsc')
const aws = require('aws-sdk')
const config = require('config')
const Promise = require('promise')

var exports = module.exports = {}

var getRecordsFromShardIterator = function(kinesis, stream, shardIterator) {
  var params = {
    ShardIterator: shardIterator,
    Limit: stream.Limit
  }
  var avroType = avro.parse(stream.AvroSchema);

  return new Promise(function (resolve, reject) {
    kinesis.getRecords(params, function(err, data) {
      if (err) console.log(err);
      console.log("Found "+data.Records.length+" records for "+stream.StreamName)

      var decodedRecords = data.Records
        .map(function(record){
          return {
            Timestamp: record.ApproximateArrivalTimestamp,
            Data: avroType.fromBuffer(record.Data)
          }
        })

      resolve({
        StreamName: stream.StreamName,
        Records: decodedRecords
      })
    })
  })
}

var getRecordsFromShardIterators = function(kinesis, stream, shardIterators) {
  var promises = shardIterators.map(function(shardIterator){
    return getRecordsFromShardIterator(kinesis, stream, shardIterator)
  })

  return Promise.all(promises)
}

var getRecordsFromStream = function(kinesis, stream){
  return new Promise(function (resolve, reject) {
    // first get the shards for the stream
    getShards(kinesis, stream)
      // then get the shard iterators for each shard
      .then(function(shards){
        return getShardIterators(kinesis, stream, shards)
      })
      // then get the records for each shard iterator
      .then(function(shardIterators){
        return getRecordsFromShardIterators(kinesis, stream, shardIterators)
      })
      // then return the records
      .then(function(records){
        resolve(records)
      })
  })
}

var getShards = function(kinesis, stream){
  var params = {
    StreamName: stream.StreamName
  }

  return new Promise(function (resolve, reject) {
    kinesis.describeStream(params, function(err, data) {
      if (err) console.log(err);
      // console.log("Found "+data.StreamDescription.Shards.length+ " shards in "+stream.StreamName)
      resolve(data.StreamDescription.Shards)
    })
  })
}

var getShardIterator = function(kinesis, stream, shard){
  var params = {
    ShardId: shard.ShardId,
    ShardIteratorType: stream.ShardIteratorType,
    StreamName: stream.StreamName
  }

  return new Promise(function (resolve, reject) {
    kinesis.getShardIterator(params, function(err, data) {
      if (err) console.log(err);
      // console.log("Found shard iterator for "+stream.StreamName)
      resolve(data.ShardIterator)
    })
  })
}

var getShardIterators = function(kinesis, stream, shards){
  var promises = shards.map(function(shard){
    return getShardIterator(kinesis, stream, shard)
  })

  return Promise.all(promises)
}


exports.getStreams = function(streams){
  var kinesis = new aws.Kinesis()
  kinesis.config.region = config.get('kinesis').region
  kinesis.config.endpoint = config.get('kinesis').endpoint
  kinesis.region = config.get('kinesis').region
  kinesis.endpoint = config.get('kinesis').endpoint

  console.log("Retrieving "+streams.length+ " streams")

  // convert stream names into promises
  var promises = streams.map(function(stream){
    return getRecordsFromStream(kinesis, stream)
  })

  // callback when promises are resolved
  return Promise.all(promises)
}
