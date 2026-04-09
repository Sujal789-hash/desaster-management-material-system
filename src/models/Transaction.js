const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  type: {
    type: String,
    enum: ['RECEIPT', 'MOVEMENT', 'DELIVERY'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  source: {
    type: String, // e.g., 'Warehouse A', 'Red Cross'
    required: true
  },
  destination: {
    type: String, // e.g., 'Camp 1', 'Family Smith'
    required: true
  },
  status: {
    type: String,
    enum: ['IN_TRANSIT', 'COMPLETED'],
    default: 'COMPLETED'
  },
  notes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
