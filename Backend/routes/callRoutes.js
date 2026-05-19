import express from 'express';
import { startCall, leaveCall, endCall, getCallStatus, resetAllOngoingCalls } from '../controllers/callController.js';
import protectRoute from '../middlewere/auth.js';

const router = express.Router();

router.post('/start/:conversationId', protectRoute, startCall);
router.post('/leave/:conversationId', protectRoute, leaveCall);
router.post('/end/:conversationId', protectRoute, endCall);
router.get('/status/:conversationId', protectRoute, getCallStatus);
router.post('/reset-all', protectRoute, resetAllOngoingCalls);

export default router;
