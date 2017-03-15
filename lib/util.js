const aws = require('aws-sdk')
const Promise = require('promise');

var exports = module.exports = {}

var getRecords = function(kinesis, stream){

  getShardIterator(kinesis, stream).then(function(resp){
    var params = {
      ShardIterator: resp.ShardIterator,
      Limit: 0
    }
    return new Promise(function (resolve, reject) {
      kinesis.getRecords(params, function(err, data) {
        resolve(data)
      })
    })

  })
}

var getShardIterator = function(kinesis, stream){
  var params = {
    ShardId: stream.ShardId,
    ShardIteratorType: stream.ShardIteratorType,
    StreamName: stream.StreamName
  }

  return new Promise(function (resolve, reject) {
    kinesis.getShardIterator(params, function(err, data) {
      resolve(data)
    })
  })
}


exports.getStreams = function(streams, callback){
  var kinesis = new aws.Kinesis()

  // convert stream names into promises
  var promises = streams.map(function(stream){
    return getRecords(kinesis, stream)
  })

  // callback when promises are resolved
  return Promise.all(promises)
}
