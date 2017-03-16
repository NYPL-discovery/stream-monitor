const config = require('config')
const express = require('express')
const getStreams = require('./lib/util').getStreams
const Promise = require('promise')

var app = express()

// Enable static files
app.use(express.static('public'))

// Only allow GET requests
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next();
});

// Retrieve streams
app.get('/streams', function (req, res) {
  getStreams(config.get('streams')).then(function(promiseResponses){
    var resp = [].concat.apply([], promiseResponses);
    res.type('application/json')
    res.status(200).send(JSON.stringify(resp))
  })
});

app.listen(3000)

module.exports = app;
