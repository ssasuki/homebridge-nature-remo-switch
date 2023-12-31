let Service, Characteristic;
let exec = require("child_process").exec;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-nature-remo-switch", "NatureRemoSwitch", Switch);
}

function Switch(log, config) {
  this.log = log;

  this.name = config["name"];
  this.access_token = config["access_token"];
  this.signal_ID_on = config["signal_ID_on"];
  this.signal_ID_off = config["signal_ID_off"];
  this.signal_ID_on_times = config["signal_ID_on_times"];
  this.signal_ID_off_times = config["signal_ID_off_times"];

  this.state = { power: false };

  this.informationService = new Service.AccessoryInformation();
  this.informationService
    .setCharacteristic(Characteristic.Manufacturer, "Homebridge")
    .setCharacteristic(Characteristic.Model, "NatureRemoSwitch")
    .setCharacteristic(Characteristic.SerialNumber, "NRTS-" + this.name);

  this.switchService = new Service.Switch(this.name);
  this.switchService.getCharacteristic(Characteristic.On)
    .on('set', this.setPower.bind(this));
}

Switch.prototype.getServices = function() {
  return [this.informationService, this.switchService];
}

Switch.prototype.setPower = function(value, callback) {
  if (this.state.power != value) {
    this.state.power = value;
    this.log('Setting switch to ' + value);
    
    const signalID = value ? this.signal_ID_on : this.signal_ID_off;
    const signalTimes = value ? this.signal_ID_on_times : this.signal_ID_off_times;
    
    for (let i = 0; i < signalTimes; i++) {
      this.cmdRequest(signalID, function(error, stdout, stderr) {
        if (error) {
          this.log('Failed to set: ' + error);
          callback(error);
        }
      }.bind(this));
      sleep(3000);
      this.log('wait for 3 sec');
    }
    this.state.power = false;
  }
  callback();
}

Switch.prototype.cmdRequest = function(signalID, callback) {
  let cmd = 'curl -X POST ' +
            '"https://api.nature.global/1/signals/' + signalID + '/send" ' +
            '-H "accept":"application/json" ' +
            '-k --header "Authorization":"Bearer ' + this.access_token + '"';
  exec(cmd, function(error, stdout, stderr) { callback(error, stdout, stderr); });
}

function sleep(waitMsec) {
  var startMsec = new Date();
  // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
  while (new Date() - startMsec < waitMsec);
}
