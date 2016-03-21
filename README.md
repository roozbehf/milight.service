# Milight Controller Service

This is a simple REST service (not fully REST compliant) to control milight RGB lights. The service uses
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

## Configuration
The configuration file `config.json` is optional and currently the following options are supported:
- `milight_host` *String* The hostname of the milight module. Default: 'milight'
- `http_port` *Number* The HTTP port to which the server will bind.
- `zone_names` *JSON* An optionally partial array of zone id numbers to a *String*. For example
  ```
  "zone_names": {"1": "Dining Room", "4": "Corridor"}
  ```

## Example
If the service is running on *localhost* port *8030*, you can set the light(s) in zone 2 to white with 50% brightness using `curl`:
```
curl -X PUT http://localhost:8030/2/white-50
```

## API
The API is very simple and tries to be as close to REST (and adheres to [{json:api](http://jsonapi.org/) specs) as it is practically reasonable.

### List of Zones
```
GET / HTTP/1.1
```
Returns the list of zone ids.

**Example**
```
http://localhost:8030/
---
{
  "data": ["1", "2", "3", "4", "all"]
}
```

### Zone Information
```
GET /:zone HTTP/1.1
```
Returns information about the given zone, mainly its name and available operations on it.

**Example**
```
http://localhost:8030/1
---
{
  "id": "1",
  "name": "Living Room",
  "links": {
    "on": "http://localhost:8030/1/on",
    "off": "http://localhost:8030/1/off",
    "bright": "http://localhost:8030/1/bright",
    "white": "http://localhost:8030/1/white",
    "rgb": "http://localhost:8030/1/rgb"
  }
}
```

### Update Zone
```
GET /:zone/:cmd HTTP/1.1
```
Updates the zone's status based on the given command. Here is one corner where
for practical reasons I deviate from REST. If commands require a parameter,
for example the `white` command, it requires the parameter to be provided after the
command's name and separated with a dash.

**Example**
```
http://localhost:8030/1/bright-50
---
HTTP/1.1 200 OK
```

### Errors
In case of errors, the reutrned JSON object will have an `errors` attribute listing all the relevant
error messages.

**Example**
```
http://localhost:8030/5/bright-50
---
HTTP/1.1 400 Bad Request
{
  "errors": ["Zone '5' does not exist."]
}
```


## Acknowledgement
Thanks to [Olivier Oeuillot](https://github.com/oeuillot) for the [node-milight](https://github.com/oeuillot/node-milight) module.

## LICENSE
[BSD 2-Clause](https://opensource.org/licenses/BSD-2-Clause)
