const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Medical', 'Equipment', 'Shelter', 'Water', 'Other']
  },
  unit: {
    type: String, // e.g. "liters", "boxes", "kits"
    required: true
  },
  availableQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  expiryDate: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);
