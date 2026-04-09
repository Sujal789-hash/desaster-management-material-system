const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');
const captcha = require('../utils/captcha');

const router = express.Router();

// @route   GET /api/auth/captcha
// @desc    One-time math challenge for login/register
// @access  Public
router.get('/captcha', (req, res) => {
  try {
    res.json(captcha.generate());
  } catch (e) {
    res.status(500).json({ message: 'Could not create captcha' });
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password, role, captchaId, captchaAnswer } = req.body;

  const cap = captcha.verify(captchaId, captchaAnswer);
  if (!cap.ok) {
    return res.status(400).json({ message: cap.message });
  }

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      username,
      password,
      role
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Auth user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password, captchaId, captchaAnswer } = req.body;

  const cap = captcha.verify(captchaId, captchaAnswer);
  if (!cap.ok) {
    return res.status(400).json({ message: cap.message });
  }

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account disabled. Contact admin.' });
      }

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @route   PUT /api/auth/users/:id
// @desc    Update user (activate/deactivate, change role)
// @access  Private/Admin
router.put('/users/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.role = req.body.role || user.role;
      if (req.body.isActive !== undefined) {
        user.isActive = req.body.isActive;
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user' });
  }
});

module.exports = router;
