import express from 'express'
import protectRoute from '../middlewere/auth.js';

import checkAvailable, {  getConversationsForSidebar ,createGroupChat, leaveGroup, createSoloChat, addUserToGroup, renameGroup } from '../controllers/conversationController.js';
const conversationRouter = express.Router();

conversationRouter.get("/get/conversation",protectRoute,getConversationsForSidebar);
conversationRouter.post("/creategroup/conversation",protectRoute,createGroupChat);
conversationRouter.post("/createsolo/conversation/:userId", protectRoute, createSoloChat);
conversationRouter.post("/leavegroup/conversation/:id", protectRoute, leaveGroup);
conversationRouter.post("/adduserto/conversation/:id", protectRoute, addUserToGroup);
conversationRouter.post("/renamegroup/conversation/:id", protectRoute, renameGroup);
conversationRouter.get("/isexist/conversation/:userId", protectRoute, checkAvailable);
export default conversationRouter;