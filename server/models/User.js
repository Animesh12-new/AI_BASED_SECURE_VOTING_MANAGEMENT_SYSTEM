const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  aadhaarNumber: { type: String, required: true, unique: true },
  dob: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true }, // <-- NEW: Added Email
  otp: { type: String },                   // <-- NEW: Temporary storage for the code
  otpExpires: { type: Date },              // <-- NEW: So the code expires after 5 mins
  imagePath: { type: String }, 
  hasVoted: { type: Boolean, default: false },
  role: { type: String, default: 'voter' }
}, { timestamps: true });

// Using your original two-line export!
const User = mongoose.model('User', userSchema);
module.exports = User;