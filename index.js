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

Switch.prototype.sendSignal = function(signalID) {
  return new Promise((resolve, reject) => {
    const cmd = 'curl -X POST ' +
      '"https://api.nature.global/1/signals/' + signalID + '/send" ' +
      '-H "accept: application/json" ' +
      '-H "Authorization: Bearer ' + this.access_token + '"';

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

Switch.prototype.setPower = async function(value, callback) {
  try {
    this.log('Setting switch to ' + value);

    const signalID = value ? this.signal_ID_on : this.signal_ID_off;
    const signalTimes = value ? this.signal_ID_on_times : this.signal_ID_off_times;

    for (let i = 0; i < signalTimes; i++) {
      await this.sendSignal(signalID);
      this.log(`Signal sent (${i + 1}/${signalTimes}), wait 3 sec`);
      await delay(3000);
    }

    // トグル用途：必ず OFF 表示に戻す
    this.switchService
      .getCharacteristic(Characteristic.On)
      .updateValue(false);

    callback();
  } catch (err) {
    this.log('Failed to set power: ' + err);
    callback(err);
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
