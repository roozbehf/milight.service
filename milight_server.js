/*
 A simple service offering an HTTP front to milight controllers.
*/
'use strict';

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
    console.error('Could not read config file. Using default values.');
    console.dir(err);
  } else {
    config = extend(true, {}, config, obj);
    console.log('Configuration file loaded.');
    console.dir(config);
    events.emit('configLoaded');
  }
});

function setupServer() {
  milight = new Milight({
      host: config.milight_host,
      broadcast: true
  });

  app.put('/:zone/:cmd', milightService);

  app.get('/:zone', identifyZone);

  app.get('/', listZones);

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
  } else {
    res.status(400).json({error: [msgInvalidZone(zone)]})
  }
}

function milightService(req, res) {
  var zone = req.params.zone;
  var cmd_full = req.params.cmd
  var param;
  param = undefined;

  var pieces = cmd_full.split('-');
  var cmd = pieces[0];
  if (pieces.length > 1) {
    param = pieces[1];
  }
  var msg = updateZone(zone, cmd, param);

  if (msg !== undefined) {
    res.status(400).json({errors: [msg]});
  } else {
    res.sendStatus(200);
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
