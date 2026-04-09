const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Material = require('../models/Material');
const { protect } = require('../middleware/auth');

// Helper to handle material quantity logic
const handleStockUpdate = async (materialId, type, quantity) => {
  const material = await Material.findById(materialId);
  if (!material) throw new Error('Material not found');

  if (type === 'RECEIPT') {
    material.availableQuantity += quantity;
  } else if (type === 'MOVEMENT' || type === 'DELIVERY') {
    if (material.availableQuantity < quantity) {
      throw new Error('Insufficient material quantity available');
    }
    material.availableQuantity -= quantity;
  }
  
  await material.save();
  return material;
};

// @route   GET /api/transactions
// @desc    Get all transactions with optional pagination
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({})
      .populate('material', 'name category unit')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });
      
    const count = await Transaction.countDocuments({});

    res.json({ transactions, page, pages: Math.ceil(count / limit), total: count });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
});

// @route   POST /api/transactions/:type
// @desc    Log a transaction (receipt, movement, delivery)
// @access  Private
router.post('/:type', protect, async (req, res) => {
  let { type } = req.params;
  type = type.toUpperCase();

  if (!['RECEIPT', 'MOVEMENT', 'DELIVERY'].includes(type)) {
    return res.status(400).json({ message: 'Invalid transaction type' });
  }

  const { materialId, quantity, source, destination, status, notes } = req.body;

  try {
    // 1. Update Material Stock
    await handleStockUpdate(materialId, type, quantity);

    // 2. Log Transaction
    const transaction = await Transaction.create({
      material: materialId,
      type,
      quantity,
      source,
      destination,
      status: status || 'COMPLETED',
      notes
    });

    const populated = await Transaction.findById(transaction._id)
      .populate('material', 'name category unit')
      .lean();

    const io = req.app.get('io');
    if (io && populated) {
      io.emit('transaction:new', populated);
      if (type === 'MOVEMENT') {
        io.emit('tracking:movement', {
          source: populated.source,
          destination: populated.destination,
          materialName: populated.material?.name,
          quantity: populated.quantity,
          status: populated.status,
        });
      }
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server error creating transaction' });
  }
});

module.exports = router;
