/*
 A simple service offering an HTTP front to milight controllers.
*/
'use strict';

var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'milight.service',
  // level: DEBUG,
  // serializers: {req: bunyan.stdSerializers.req}
  serializers: {req: reqSerializer}
});

var express = require('express');
var app = express();
var jsonfile = require('jsonfile');
var extend = require('extend');
var Milight = require("milight");
var milight;

const zones = ['1', '2', '3', '4', 'all'];
const commands = ['on', 'off', 'bright', 'white', 'rgb'];
const configFileName = '/config.json';
var config = {
  milight_host: 'milight',
  http_port: 8030,
  http_host: 'localhost',
  base_url: 'http://localhost:8030'
};

// --- log serializer
function reqSerializer(req) {
    return {
        method: req.method,
        url: req.url,
        headers: req.headers
    };
}

// --- setup the events system
const EventEmitter = require('events');
const util = require('util');

function EventController() {
  EventEmitter.call(this);
}
util.inherits(EventController, EventEmitter);

const events = new EventController();

// --- load config file
events.on('configLoaded', setupServer);

var file = __dirname + configFileName;
jsonfile.readFile(file, function(err, obj) {
  if (err) {
    log.warn({error: err}, 'Could not read config file. Using default values.');
  } else {
    config = extend(true, {}, config, obj);
    if (obj.base_url == undefined) {
      config.base_url = 'http://'
          + config.http_host
          + (config.http_port == '80' ? '' : (':' + config.http_port));
    }
    log.info('Configuration file loaded.');
  }
  log.info({config: config});
  events.emit('configLoaded');
});

function setupServer() {
  milight = new Milight({
      host: config.milight_host,
      broadcast: true
  });

  app.post('/zones/:zone/:cmd/:param?', milightService);

  app.get('/zones/:zone', identifyZone);

  app.get('/zones', listZones);

  app.listen(config.http_port, config.http_host, function () {
    console.log('Milight service is listening on port %s.', config.http_port);
  });
}

// --- Create an invalid zone error message
function msgInvalidZone(zone) {
  return 'Zone \'' + zone + '\' does not exist.';
}

function getZoneRef(req, zone) {
  return config.base_url + '/zones/' + zone;
}

// --- Zones List
function listZones(req, res) {
  var data = [];
  for (var i in zones) {
    var zone = zones[i];
    data.push({id: zone, links: {self: getZoneRef(req, zone)}})
  }
  res.json({data: data});
  log.info({req: req}, 'Responded to a zones list query.');
}

// --- Zone Identifier
function identifyZone(req, res) {
  var zone = req.params.zone;
  if (zones.indexOf(zone) >= 0) {
    var data = {id: zone, name: ('zone ' + zone)};
    if (config.zone_names && config.zone_names[zone]) {
      data.name = config.zone_names[zone];
    }
    var links = {self: getZoneRef(req, zone)};
    for (var i in commands) {
      links[commands[i]] = getZoneRef(req, zone) + '/' + commands[i];
    }
    res.json({data: data, links: links});
    log.info({req: req, data: data}, 'Responded to a zone id query.');
  } else {
    var errorMsg = msgInvalidZone(zone);
    res.status(400).json({error: [errorMsg]});
    log.error({req: req, error: errorMsg}, 'Invalid zone id query.');
  }
}

function milightService(req, res) {
  var zone = req.params.zone;
  var cmd = req.params.cmd
  var param = req.params.param;

  function milightServiceCallBack(error) {
    if (error) {
      error = error.toString();
      res.status(400).json({errors: [error]});
      log.error({req: req, error: error}, 'Invalid command request.');
    } else {
      res.sendStatus(202);
      log.info({req: req}, 'Applied a light command.');
    }
  }

  var msg = updateZone(zone, cmd, param, milightServiceCallBack);
}

function updateZone(zone, cmd, param, callback) {
  var mzone;

  if (zones.indexOf(zone) < 0) {
    callback(msgInvalidZone(zone));
  }

  // set zone
  if (zone == 'all') {
    mzone = milight.allZones();
  } else {
    mzone = milight.zone(parseInt(zone));
  }

  switch (cmd) {
    case 'on':
      mzone.on(callback);
      break;

    case 'off':
      mzone.off(callback);
      break;

    case 'white':
      if (param === undefined) {
        param = '100';
      }
      var mparam = intValue(param);
      if (mparam !== undefined) {
        mzone.white(mparam, callback);
      } else {
        callback("'" + param + "' is not a numeric value.");
      }
      break;

    case 'bright':
      if (param === undefined) {
        param = '100';
      }
      var mparam = intValue(param);
      if (mparam !== undefined) {
        mzone.brightness(mparam, callback);
      } else {
        callback("'" + param + "' is not a numeric value.");
      }
      break;

    case 'rgb':
      if (notEmptyValue(param)) {
        mparam = '#' + param;
        mzone.rgb(mparam, callback);
      } else {
        callback("'" + param + "' is not an RGB value.");
      }
      break;

    default:
      callback('Command \'' + cmd + '\' not found.');
  }

}

function notEmptyValue(str) {
  return (str !== undefined) && (str.length > 0);
}

function intValue(str) {
  if (notEmptyValue(str)) {
    var result = parseInt(str);
    if (isNaN(result)) {
      return undefined;
    } else {
      return result;
    }
  } else {
    return undefined;
  }
}
