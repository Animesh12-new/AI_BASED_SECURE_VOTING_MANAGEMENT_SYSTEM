// server/models/Candidate.js
const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  party: {
    type: String,
    required: true
  },
  voteCount: {
    type: Number,
    default: 0 // Every candidate starts with 0 votes
  }
});

const Candidate = mongoose.model('Candidate', candidateSchema);
module.exports = Candidate;