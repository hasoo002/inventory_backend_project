const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { processVoiceInput, getVoiceLogs } = require('../controllers/aiController');

router.use(protect);
router.post('/process', processVoiceInput);
router.get('/logs', getVoiceLogs);

module.exports = router;