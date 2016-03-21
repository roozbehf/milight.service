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
  milight_host: "milight",
  http_port: 8030
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
    log.info('Configuration file loaded.');
    log.info(config);
    events.emit('configLoaded');
  }
});

function setupServer() {
  milight = new Milight({
      host: config.milight_host,
      broadcast: true
  });

  app.post('/zones/:zone/:cmd/:param?', milightService);

  app.get('/zones/:zone', identifyZone);

  app.get('/zones', listZones);

  app.listen(config.http_port, function () {
    console.log('Milight controller app listening on port %s!', config.http_port);
  });
}

// --- Create an invalid zone error message
function msgInvalidZone(zone) {
  return 'Zone \'' + zone + '\' does not exist.';
}

function getZoneRef(req, zone) {
  return 'http://' + req.headers.host + '/' + zone;
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

  var msg = updateZone(zone, cmd, param);

  if (msg !== undefined) {
    res.status(400).json({errors: [msg]});
    log.error({req: req, error: msg}, 'Invalid command request.');
  } else {
    res.sendStatus(202);
    log.info({req: req}, 'Applied a light command.');
  }
}

function updateZone(zone, cmd, param) {
  var mzone;

  if (zones.indexOf(zone) < 0) {
    return msgInvalidZone(zone);
  }

  // set zone
  if (zone == 'all') {
    mzone = milight.allZones();
  } else {
    mzone = milight.zone(parseInt(zone));
  }

  var merror;
  merror = undefined;

  function onError(error) {
    merror = error;
  }

  function checkParam(str) {
    return (str !== undefined) && (str.length > 0);
  }

  function intParam(str) {
    if (checkParam(str)) {
      var result = parseInt(str);
      if (isNaN(result)) {
        merror = "'" + str + "' is not a numeric value.";
        return undefined;
      } else {
        return result;
      }
    }
  }

  switch (cmd) {
    case 'on':
      mzone.on(onError);
      break;

    case 'off':
      mzone.off();
      break;

    case 'white':
      var mparam = intParam(param);
      if (mparam !== undefined) {
        mzone.white(mparam);
      }
      break;

    case 'bright':
      mparam = intParam(param);
      if (mparam !== undefined) {
        mzone.brightness(mparam);
      }
      break;

    case 'rgb':
      if (checkParam(param)) {
        mparam = '#' + param;
        mzone.rgb(mparam);
      }
      break;

    default:
      return 'Command \'' + cmd + '\' not found.';
  }

  return merror;
}
