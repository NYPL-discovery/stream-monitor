var App = (function() {
  function App(options) {
    var defaults = {
      container: '#main',
      pollEvery: 2000,
      trackingKey: 'trackingId',
      displayKey: 'number',
      limitRecords: 20,
      margin: 20,
      colors: ['#edcbcb','#cbedcd','#cbcbed','#eed990','#f2bdf0','#f3eea1','#a1f3e3','#d8b2f1']
    };
    this.opt = _.extend({}, defaults, options);
    this.init();
  }

  App.prototype.init = function(){
    var _this = this;

    this.polling = false;
    this.uiLoaded = false;
    this.streams = {};
    this.trackingIds = [];
    this.$container = $(this.opt.container);

    var date = new Date();
    this.timestamp = date.toISOString();

    this.loadListeners();
  };

  App.prototype.isRecordsEmpty = function(streams){
    if (!streams.length) return true;
    var records = _.flatten(_.pluck(streams, 'Records'), true);
    return (records.length <= 0);
  };

  App.prototype.loadListeners = function(){
    var _this = this;

    // click
    this.$container.on('click', function(){ _this.poll(); });
  };

  App.prototype.loadUI = function(streams){
    var streamCount = _.keys(streams).length;
    var streamWidth = 100.0 / streamCount;
    var $container = this.$container;
    if (!streamCount) return;

    var left = 0;
    _.each(streams, function(stream, key){
      var $stream = $('<div class="stream" data-key="'+key+'"></div>');

      $stream.css({width: streamWidth+'%', left: left+'%'});
      $stream.append($('<div class="stream-header">'+key+'</div>'));
      $stream.append($('<div class="stream-messages"></div>'));

      $container.append($stream);
      left += streamWidth;
    });

    this.uiLoaded = true;
  };

  App.prototype.poll = function(){
    var _this = this;
    var params = {
      timestamp: this.timestamp
    };

    $.getJSON('streams', params, function(resp){
      console.log(resp);
      _this.render(resp);
    });
  };

  App.prototype.render = function(data){
    // no new records, do nothing
    if (this.uiLoaded && this.isRecordsEmpty(data)) return;

    // load new stream data
    if (data) this.streamsLoad(data);

    // build UI if not already loaded
    if (!this.uiLoaded) this.loadUI(this.streams);

    // add/remove records
    this.renderNewRecords(this.streams);
    this.renderOldRecords(this.streams);
  };

  App.prototype.renderNewRecords = function(streams){
    var _this = this;
    var displayKey = this.opt.displayKey;
    var trackingKey = this.opt.trackingKey;
    var colors = this.opt.colors;
    var colorCount = colors.length;
    var trackingIds = this.trackingIds;

    _.each(streams, function(stream, key){
      var $streamMessages = $('.stream[data-key="'+key+'"] .stream-messages').first();

      _.each(stream.Records, function(record, i){
        // element does not exist, add it
        if (!('el' in record)) {
          var $message = $('<div class="stream-message" data-key="'+record[trackingKey]+'">'+record[displayKey]+'</div>');
          $streamMessages.append($message);
          _this.streams[key].Records[i].el = $message;
        }
      });
    });
  };

  App.prototype.renderOldRecords = function(streams){
    var _this = this;

    _.each(streams, function(stream, key){
      var $streamMessages = $('.stream[data-key="'+key+'"] .stream-messages').first();

      // remove elements from DOM
      _.each(stream.Records, function(record, i){
        if ('el' in record && 'remove' in record) {
          record.el.remove();
        }
      });

      // remove them from the data too
      _this.streams[key].Records = _.reject(stream.Records, function(r) { return ('remove' in r); });
    });
  };

  App.prototype.streamsLoad = function(newStreamData){
    var _this = this;
    var limit = this.opt.limitRecords;
    var trackingKey = this.opt.trackingKey;
    var trackingIds = this.trackingIds;

    // go through streams
    _.each(newStreamData, function(d){
      var key = d.StreamName;

      // stream exists, add new records
      if (key in _this.streams) {
        // retrieve stream's existing tracking ids
        var streamTrackingIds = _.pluck(_this.streams[key].Records, trackingKey);

        // only add records where tracking ids don't exist
        _.each(d.Records, function(record){
          if (_.indexOf(streamTrackingIds, record[trackingKey]) < 0) {
            _this.streams[key].Records.push(record);
          }
        });

      // stream doesn't exist, add
      } else {
        _this.streams[key] = _.clone(d);
      }

      // TODO: add new tracking ids
    });

    // sort and limit
    _.each(this.streams, function(stream, key){
      // sort from most recent, descending
      stream.Records = _.sortBy(stream.Records, function(r){ return -1 * Date.parse(r.timestamp); });

      // mark records that should be removed
      if (stream.Records.length > limit) {
        stream.Records = _.map(stream.Records, function(record, i){
          if (i >= limit) record.remove = true;
          return record;
        });
      }
      _this.streams[key] = stream;
    });

    // retrieve last timestamp
    var records = _.flatten(_.pluck(this.streams, 'Records'), true);
    if (records.length > 0) {
      records = _.sortBy(records, function(r){ return -1 * Date.parse(r.timestamp); });
      var latestDate = new Date(records[0].timestamp);
      // add a millisecond and update timestamp
      var adjustedDate = new Date(latestDate.getTime() + 1);
      this.timestamp = adjustedDate.toISOString();
    }
  };

  return App;

})();

$(function() {
  var app = new App(CONFIG);
});
