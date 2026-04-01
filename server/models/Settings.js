const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
isElectionLive: {
type: Boolean,
default: false
}
});

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;