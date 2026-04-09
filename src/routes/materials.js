const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const { protect, admin } = require('../middleware/auth');

// @route   GET /api/materials
// @desc    Get all materials with optional pagination and search
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const keyword = req.query.keyword
      ? {
          name: {
            $regex: req.query.keyword,
            $options: 'i',
          },
        }
      : {};

    const materials = await Material.find({ ...keyword }).limit(limit).skip(skip).sort({ createdAt: -1 });
    const count = await Material.countDocuments({ ...keyword });

    res.json({ materials, page, pages: Math.ceil(count / limit), total: count });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching materials' });
  }
});

// @route   POST /api/materials
// @desc    Create a new material type
// @access  Private
router.post('/', protect, async (req, res) => {
  const { name, category, unit, availableQuantity, expiryDate } = req.body;

  try {
    const materialExists = await Material.findOne({ name });
    if (materialExists) {
      return res.status(400).json({ message: 'Material name already exists' });
    }

    const material = await Material.create({
      name,
      category,
      unit,
      availableQuantity: availableQuantity || 0,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('material:created', material.toObject());
    }

    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating material' });
  }
});

// @route   PUT /api/materials/:id
// @desc    Update material
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (material) {
      material.name = req.body.name || material.name;
      material.category = req.body.category || material.category;
      material.unit = req.body.unit || material.unit;
      
      if (req.body.expiryDate) {
        material.expiryDate = new Date(req.body.expiryDate);
      }

      const updatedMaterial = await material.save();
      const io = req.app.get('io');
      if (io) {
        io.emit('material:updated', updatedMaterial.toObject());
      }
      res.json(updatedMaterial);
    } else {
      res.status(404).json({ message: 'Material not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error updating material' });
  }
});

// @route   DELETE /api/materials/:id
// @desc    Delete material
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    // Check if quantity is 0 before deleting to ensure physical integrity
    if (material.availableQuantity > 0) {
      return res.status(400).json({ message: 'Cannot delete material with quantity > 0' });
    }

    const id = material._id.toString();
    await material.deleteOne();
    const io = req.app.get('io');
    if (io) {
      io.emit('material:deleted', { _id: id });
    }
    res.json({ message: 'Material removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting material' });
  }
});

module.exports = router;
