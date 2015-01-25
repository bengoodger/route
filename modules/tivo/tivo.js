var EventEmitter = require('events').EventEmitter;
var util = require('util');
var net = require('net');

function Tivo(data) {
  this.host = data.host;

  this.commands = {};
  this.commands.TeleportTivo = "TELEPORT TIVO";
  this.commands.TeleportLiveTV = "TELEPORT LIVETV";
  this.commands.TeleportGuide = "TELEPORT GUIDE";
  this.commands.TeleportNowPlaying = "TELEPORT NOWPLAYING";
  this.commands.ThumbsUp = "IRCODE THUMBSUP";
  this.commands.ThumbsDown = "IRCODE THUMBSDOWN";
  this.commands.ChannelUp = "IRCODE CHANNELUP";
  this.commands.ChannelDown = "IRCODE CHANNELDOWN";
  this.commands.Up = "IRCODE UP";
  this.commands.Down = "IRCODE DOWN";
  this.commands.Left = "IRCODE LEFT";
  this.commands.Right = "IRCODE RIGHT";
  this.commands.Select = "IRCODE SELECT";
  this.commands.CCOn = "IRCODE CC_ON";
  this.commands.CCOff = "IRCODE CC_OFF";
  this.commands.Play = "IRCODE PLAY";
  this.commands.Forward = "IRCODE FORWARD";
  this.commands.Reverse = "IRCODE REVERSE";
  this.commands.Pause = "IRCODE PAUSE";
  this.commands.Slow = "IRCODE SLOW";
  this.commands.Replay = "IRCODE REPLAY";
  this.commands.Advance = "IRCODE ADVANCE";
  this.commands.Record = "IRCODE RECORD";
  this.commands.Num0 = "IRCODE NUM0";
  this.commands.Num1 = "IRCODE NUM1";
  this.commands.Num2 = "IRCODE NUM2";
  this.commands.Num3 = "IRCODE NUM3";
  this.commands.Num4 = "IRCODE NUM4";
  this.commands.Num5 = "IRCODE NUM5";
  this.commands.Num6 = "IRCODE NUM6";
  this.commands.Num7 = "IRCODE NUM7";
  this.commands.Num8 = "IRCODE NUM8";
  this.commands.Num9 = "IRCODE NUM9";
  this.commands.SetChannel = "SETCH %d";
  this.commands.ForceChannel = "FORCECH %d";
  this.commandQueue = [];

  this.connect();
};
util.inherits(Tivo, EventEmitter);
 
Tivo.prototype.PORT = 31339;

Tivo.prototype.connect = function() {
  this._reconnecting = false;
  this.client = net.connect({ host: this.host, port: this.PORT });
  this.client.on("data", this.handleData.bind(this));
  this.client.on("error", this.handleError.bind(this));
  this.client.on("close", this.handleError.bind(this));
}

Tivo.prototype.handleData = function(data) {
  //..
  console.log("DaTA: " + data);
}

Tivo.prototype.handleError = function(error) {
  console.log("Error: " + error);
  setTimeout(this.reconnect.bind(this), 10000);
}

Tivo.prototype.reconnect = function() {
  if (this._reconnecting)
    return;
  this._reconnecting = true;
  setTimeout(this.connect.bind(this), 1000);
}

Tivo.prototype.send = function(buf) {
  var isFirstRequest = (this.commandQueue.length == 0);
  this.commandQueue.push(buf);
  if (isFirstRequest)
    setTimeout(this.sendNextCommand.bind(this), 10); // nextTick is not behaving correctly
};

Tivo.prototype.sendNextCommand = function() {
  if (!this.commandQueue.length) return;
  var buf = this.commandQueue.shift();
  console.log("> ", buf);
  this.client.write(buf + "\r", undefined, function () {
    setTimeout(this.sendNextCommand.bind(this), 300);  
  }.bind(this));
};

Tivo.prototype.exec = function(command) {
  console.log("*  Tivo Executing: " + command);

  if (command in this.commands) {
    this.send(this.commands[command]);
    this.emit("DeviceEvent", command);
  }
};

module.exports = Tivo;
