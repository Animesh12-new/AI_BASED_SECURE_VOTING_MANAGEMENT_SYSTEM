const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
name: { type: String, required: true },
aadhaarNumber: { type: String, required: true, unique: true },
dob: { type: String, required: true },
password: { type: String, required: true },
hasVoted: { type: Boolean, default: false },
role: { type: String, default: 'voter' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;