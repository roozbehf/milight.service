# Milight Controller Service

This is a simple REST service (not really REST compliant) to control milight RGB lights. The service uses
[node-milight](https://github.com/oeuillot/node-milight) to communicate to a milight
controller accessible on the network.

**NOTE** that there is no acknowledgement nor any endorsement from milight.

## Setup and Run
1. Install node packages:
```
npm install
```
2. Configure the service by editing `config.json`.
3. Run the service either by calling node:
```
node milight_server.js
```
or through npm:
```
npm start
```

## API
The API is very simple. The service listens to GET request of the following format:
```
/[zone]/[cmd]
```
where
- **zone** is any of the values *1*, *2*, *3*, *4*, or *all*
- **cmd** is any of the following:
  - *on* to turn the zone on
  - *off* to turn the zone off
  - *white* followed by a dash ('-') and a value between 0 to 100 to set the zone to white with the given intensity
    - example: `/1/white-50` sets the zone 1 to a 50% white light
  - *bright* followed by a dash ('-') and a value between 0 to 100 to set the brightness of the zone
    - example: `/all/bright-30` sets the brightness of all zones to 30%
  - *rgb* followed by a dash ('-') and a value of the form *rrggbb* to set the zone's RGB values
    - example: `/2/rgb/ffff00` sets the color of zone 2 to orange

### Example
If the service is running on *localhost* port *8030*, you can set the light(s) in zone 2 to white with 50% brightness:
```
curl http://localhost:8030/2/white-50
```

## Configuration
The configuration file `config.json` is optional and currently the following options are supported:
- `milight_host` *String* The hostname of the milight module. Default: 'milight'
- `http_port` *Number* The HTTP port to which the server will bind.

## Acknowledgement
Thanks to [Olivier Oeuillot](https://github.com/oeuillot) for the [node-milight](https://github.com/oeuillot/node-milight) module.

## LICENSE
[BSD 2-Clause](https://opensource.org/licenses/BSD-2-Clause)
