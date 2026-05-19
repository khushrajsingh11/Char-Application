 import express from 'express'
import protectRoute from '../middlewere/auth.js';
import { getMessages, sendMessage, getCloudinarySignature, markAsSeen, deleteMessage, editMessage, reactToMessage } from '../controllers/massageController.js';
 const messageRouter = express.Router();

 messageRouter.get("/getmessages/:id",protectRoute,getMessages);
messageRouter.post("/send/:conversationId",protectRoute,sendMessage);
messageRouter.get("/cloudinary-signature",getCloudinarySignature);
messageRouter.put("/mark/:messageId",protectRoute,markAsSeen);
messageRouter.delete("/delete/:messageId", protectRoute, deleteMessage);
messageRouter.patch("/edit/:messageId", protectRoute, editMessage);
messageRouter.post("/react/:messageId", protectRoute, reactToMessage);

 export default messageRouter;