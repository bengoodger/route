var EventEmitter = require('events').EventEmitter;
var util = require('util');
var net = require('net');

// Controls an Integra 30.6 receiver.
function Integra(data) {
  this.host = data.host;

  this.actions = {};
  this.actions.Off = "!1PWR00";
  this.actions.On = "!1PWR01";
  this.actions.MuteOff = "!1AMT00";
  this.actions.MuteOn = "!1AMT01";
  this.actions.VolumeUp = "!1MVLUP";
  this.actions.VolumeDown = "!1MVLDOWN";
  this.actions.VolumeSet = "!MVL";
  this.actions.InputVideo1 = "!1SLI00";  // Blu-Ray
  this.actions.InputVideo2 = "!1SLI01";  // TiVo
  this.actions.InputVideo3 = "!1SLI02";  // PS4
  this.actions.InputVideo4 = "!1SLI03";  // Chromecast
  this.actions.InputVideo5 = "!1SLI04";  // Chromecast
  this.actions.InputVideo6 = "!1SLI05";  // Chromecast
  this.actions.InputVideo7 = "!1SLI06";  // Chromecast
  this.actions.OutputHDMI1 = "!1HDO01";  // Main HDMI
  this.actions.OutputHDMI2 = "!1HDO02";  // Sub HDMI
  this.actions.OutputBoth = "!1HDO03";   // Both
  
  this.queries = [];
  this.queries.Power = "!1PWRQSTN";
  this.queries.Mute = "!1AMTQSTN";
  this.queries.Volume = "!1MVLQSTN";
  this.queries.Input = "!1SLIQSTN";
  this.queries.Output = "!1HDOQSTN";

  this.commandQueue = [];

  this.connect();
};
util.inherits(Integra, EventEmitter);
 
Integra.prototype.PORT = 60128;
Integra.prototype.HEADER_SIZE = 0x10;

Integra.prototype.generatePayload = function(command) {
  command += "\r";
  var buf = new Buffer(this.HEADER_SIZE + 1 + command.length);
  buf.write("ISCP", 0, "utf8");
  buf.writeUInt32BE(this.HEADER_SIZE, 4);
  buf.writeUInt32BE(command.length, 8);
  buf.writeUInt32BE(0x1000000, 12);
  buf.write(command, 16);
  buf.writeUInt8(13, buf.length - 1);
  return buf;
}

Integra.prototype.connect = function() {
  this._reconnecting = false;
  this.client = net.connect({ host: this.host, port: this.PORT });
  this.client.on('data', this.handleData.bind(this));
  this.client.on('error', this.handleError.bind(this));
  this.client.on('close', this.handleError.bind(this));
}

Integra.prototype.handleError = function(error) {
  setTimeout(this.reconnect.bind(this), 10000);
}

Integra.prototype.reconnect = function() {
  if (this._reconnecting)
    return;
  this._reconnecting = true;
  setTimeout(this.connect.bind(this), 1000);
}

Integra.prototype.send = function(buf) {
  var isFirstRequest = (this.commandQueue.length == 0);
  this.commandQueue.push(buf);
  if (isFirstRequest)
    setTimeout(this.sendNextCommand.bind(this), 10); // nextTick is not behaving correctly
};

Integra.prototype.sendNextCommand = function() {
  if (!this.commandQueue.length) return;
  var buf = this.generatePayload(this.commandQueue.shift());
  this.client.write(buf, undefined, function () {
    setTimeout(this.sendNextCommand.bind(this), 300);  
  }.bind(this));
};

Integra.prototype.exec = function(command) {
  console.log("*  Integra Executing: " + command);

  var VOLUME_SET_PREFIX = "VolumeSet.";
  if (command.substring(0, VOLUME_SET_PREFIX.length) ==
      VOLUME_SET_PREFIX) {
    var level = command.substring(VOLUME_SET_PREFIX.length, command.length);
    var levelAsInt = parseInt(level);
    if (isNaN(levelAsInt) || (levelAsInt < 0 || levelAsInt > 50)) {
      console.log("*  Integra: Invalid volume level: " + levelAsInt);
      return;
    }
    level = levelAsInt.toString(16);
    if (level.length > 3) {
      console.log("*  Integra: Invalid volume level: " + level);
      return;
    }
    if (level.length == 1)
      level = "0" + level;
    this.send(("!1MVL" + level).toUpperCase());
    this.emit("DeviceEvent", command);
  } else if (command in this.actions) {
    this.send(this.actions[command]);
    this.emit("DeviceEvent", command);
  }

  this.query("Power");
  this.query("Mute");
  this.query("Volume");
  this.query("Input");
  this.query("Output");
};

Integra.prototype.query = function(command) {
  console.log("*  Integra Querying: " + command);

  if (command in this.queries)
    this.send(this.queries[command]);
}

Integra.prototype.handleData = function(data) {
  data += "";
  var command = data.substring(this.HEADER_SIZE);
  var action = command.substring(0, 5);
  var parameter = parseInt(command.substring(5, 7), 16);

  switch (action) {
    case "!1PWR":
      this.emit("StateEvent", {"Integra.Power": !!parameter});
      break;
    case "!1AMT":
      this.emit("StateEvent", {"Integra.Mute": !!parameter});
      break;
    case "!1MVL":
      this.emit("StateEvent", {"Integra.Volume": parameter});
      break;
    case "!1SLI":
      this.emit("StateEvent", {"Integra.Input": parameter});
      break;
    case "!1HDO":
      this.emit("StateEvent", {"Integra.Output": parameter});
      break;
  }
}

module.exports = Integra;