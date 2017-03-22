var App = (function() {
  function App(options) {
    var defaults = {
      container: '#main',
      pollEvery: 1000,
      trackingKey: 'trackingId',
      displayKey: 'number',
      limitRecords: 20,
      margin: 20,
      colors: ['#FF8A80','#BBDEFB','#FFB74D','#C5E1A5','#D1C4E9','#80CBC4','#FFF176','#F48FB1','#80DEEA', '#E6EE9C','#FFAB91','#E1BEE7']
    };
    this.opt = _.extend({}, defaults, options);
    this.init();
  }

  App.prototype.init = function(){
    var _this = this;

    this.polling = true;
    this.uiLoaded = false;
    this.streams = {};
    this.streamNames = [];
    this.trackingIds = [];
    this.$container = $(this.opt.container);

    var date = new Date();
    this.timestamp = date.toISOString();

    this.loadListeners();
    this.poll();
  };

  App.prototype.isRecordsEmpty = function(streams){
    if (!streams.length) return true;
    var records = _.flatten(_.pluck(streams, 'Records'), true);
    return (records.length <= 0);
  };

  App.prototype.loadListeners = function(){
    var _this = this;

    // click
    $(document).on('click', function(){
      _this.polling = ! _this.polling;
      if (_this.polling) {
        console.log('Un-paused.');
        _this.poll();

      } else {
        console.log('Paused.');
      }
    });
  };

  App.prototype.loadUI = function(streams){
    var _this = this;
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
      _this.streamNames.push(key);
    });

    this.uiLoaded = true;
  };

  App.prototype.poll = function(){
    var _this = this;
    var pollEvery = this.opt.pollEvery;
    var params = {
      timestamp: this.timestamp
    };

    $.getJSON('streams', params, function(resp){
      console.log(resp);
      _this.render(resp);
      if (_this.polling) {
        setTimeout(function(){
          _this.poll();
        }, pollEvery);
      }
    });
  };

  App.prototype.render = function(data){
    var _this = this;

    // no new records, do nothing
    if (this.uiLoaded && this.isRecordsEmpty(data)) return;

    // load new stream data
    if (data) this.streamsLoad(data);

    // build UI if not already loaded
    if (!this.uiLoaded) this.loadUI(this.streams);

    // add/remove records
    this.renderNewRecords(this.streams);
    this.renderOldRecords(this.streams);

    // render lines
    this.renderLines(this.streams);

  };

  // renders a line between two elements
  App.prototype.renderLine = function($fromEl, $toEl){
    var fromIndex = $fromEl.index();
    var toIndex = $toEl.index();
    var height = $fromEl.outerHeight(true);
    var diff = (toIndex - fromIndex) * height;
    var $line = $('<div class="line"></div>');

    if (diff > 0) {
      $line.css('height', diff+'px');
      $line.addClass('down');

    } else if (diff < 0) {
      $line.css('height', Math.abs(diff)+'px');
      $line.addClass('up');

    } else {
      $line.addClass('straight');
    }

    $fromEl.append($line);
  };

  App.prototype.renderLines = function(streams){
    var _this = this;
    var trackingKey = this.opt.trackingKey;
    var streamNames = this.streamNames;

    // reset all lines
    $('.line').remove();

    _.each(streamNames, function(streamName, i){
      if (i > 0) {
        var records = _this.streams[streamName].Records;
        var prevRecords = _this.streams[streamNames[i-1]].Records;
        _.each(records, function(record){
          var id = record[trackingKey];
          var found = _.find(prevRecords, function(r){ return r[trackingKey]==id; });
          if (found && ('el' in record) && ('el' in found)) {
            _this.renderLine(found.el, record.el);
          }
        });
      }
    });
  };

  App.prototype.renderNewRecords = function(streams){
    var _this = this;
    var displayKey = this.opt.displayKey;
    var trackingKey = this.opt.trackingKey;
    var colors = this.opt.colors;
    var colorCount = colors.length;
    var trackingIds = this.trackingIds;
    var streamNames = this.streamNames;

    _.each(streamNames, function(streamName, i){
      var stream = _this.streams[streamName];
      var $streamMessages = $('.stream[data-key="'+streamName+'"] .stream-messages').first();
      var prevRecords = false;
      if (i > 0) {
        prevRecords = _this.streams[streamNames[i-1]].Records;
      }

      _.each(stream.Records, function(record, j){
        var id = record[trackingKey];
        // retrieve time diff from previous stream
        var prevSeconds = false;
        if (prevRecords) {
          var found = _.find(prevRecords, function(r){ return r[trackingKey]==id; });
          if (found && 'timestamp' in found) {
            prevSeconds = _this._getSeconds(found.timestamp.slice(11, 23));
          }
        }
        // element does not exist, add it
        if (!('el' in record)) {
          var trackingIndex = _.indexOf(trackingIds, record[trackingKey]);
          var colorIndex = trackingIndex % colorCount;
          var color = colors[colorIndex];
          // 2017-03-20T15:00:50.898Z --> 15:00:50.898
          var timestamp = record.timestamp.slice(11, 23);
          // show the difference in seconds
          if (prevSeconds) {
            var seconds = _this._getSeconds(timestamp);
            timestamp = _this._round(seconds - prevSeconds, 2) + " seconds";
          }
          var $message = $('<div class="stream-message" data-key="'+record[trackingKey]+'"><span class="value">'+record[displayKey]+'</span><span class="timestamp">'+timestamp+'</span></div>');
          $message.css('background-color', color);
          $streamMessages.prepend($message);
          _this.streams[streamName].Records[j].el = $message;
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

      // add new tracking ids
      var newStreamTrackingIds = _.pluck(d.Records, trackingKey);
      _.each(newStreamTrackingIds, function(id){
        if (_.indexOf(id, _this.trackingIds) < 0) {
          _this.trackingIds.push(id);
        }
      });
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

  App.prototype._getSeconds = function(hhmmss){
    var parts = hhmmss.split(':'); // split it at the colons
    var seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);
    return seconds;
  };

  App.prototype._round = function(num, dec){
    return num.toFixed(dec);
  };

  return App;

})();

$(function() {
  var app = new App(CONFIG);
});
