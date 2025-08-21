import express from "express"
import { checkAuth, login, signup, updateProfile , getUsersForSearch, getMe, getAllUsers } from "../controllers/userController.js";
import  protectRoute  from "../middlewere/auth.js";

const userRoutes =express.Router();

userRoutes.post("/signup",signup);
userRoutes.post("/login",login);
userRoutes.put("/update-profile",protectRoute,updateProfile);
userRoutes.get("/check",checkAuth);
userRoutes.get("/getallusersearch",protectRoute, getUsersForSearch);
userRoutes.get("/getuser",protectRoute, getMe);
userRoutes.get("/getalluser",protectRoute, getAllUsers);
export default userRoutes;