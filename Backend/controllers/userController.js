import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js"
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";


export const signup = async (req, res) => {
    const { fullname, email, password, bio } = req.body;

    try {
        if (!fullname || !email || !password || !bio) {
            return res.json({ success: false, message: "Missing details" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullname,
            email,
            password: hashedPassword,
            bio
        });

        const token = generateToken(newUser._id);

        res.json({ success: true, userData: newUser, token, message: "Account created successfully" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.json({ success: false, message: "Incorrect credentials" });
        }

        const userData = await User.findOne({ email });
        if (!userData) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const token = generateToken(userData._id);
        res.json({ success: true, userData, token, message: "Logged in successfully" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};


export const checkAuth = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "User not authenticated" });
  }
  res.status(200).json({ success: true, user: req.user });
};


export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullname } = req.body;
        const userId = req.user._id;
        let updatedUser;

        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(userId, { bio, fullname }, { new: true });
        } else {
            const upload = await cloudinary.uploader.upload(profilePic);
            updatedUser = await User.findByIdAndUpdate(
                userId,
                { profilePic: upload.secure_url, bio, fullname },
                { new: true }
            );
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
export const getUsersForSearch = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const userConversations = await Conversation.find({
            isGroupChat: false,
            participants: loggedInUserId
        });

        const existingChatPartners = new Set();
        userConversations.forEach(convo => {
            convo.participants.forEach(participantId => {
                if (!participantId.equals(loggedInUserId)) {
                    existingChatPartners.add(participantId.toString());
                }
            });
        });

        const existingPartnersArray = Array.from(existingChatPartners);

        const usersForSearch = await User.find({
            _id: {
                $ne: loggedInUserId,
                $nin: existingPartnersArray
            }
        }).select("-password");

        res.status(200).json(usersForSearch);

    } catch (error) {
        console.error("Error in getUsersForSearch: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
