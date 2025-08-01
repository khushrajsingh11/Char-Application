 import express from 'express'
import protectRoute from '../middlewere/auth.js';
import { getMessages, sendMessage ,getCloudinarySignature,markAsSeen} from '../controllers/massageController.js';
 const messageRouter = express.Router();

 messageRouter.get("/messages/:id",protectRoute,getMessages);
messageRouter.post("/send/:id",protectRoute,sendMessage);
messageRouter.get("/cloudinary-signature",getCloudinarySignature);
messageRouter.get("/messages/mark",markAsSeen)

 export default messageRouter;