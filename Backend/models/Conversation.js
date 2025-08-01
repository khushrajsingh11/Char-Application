import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    participants:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    groupName:{
        type:String,
        trim:true
    },
    isGroupChat:{
        type:Boolean,
        default:false
    },
    groupAdmin:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    isGroupIcon:{
        type:String,
        default:""
    },
    
    lastMessage:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Message"
    }
},{timestamps:true});

const Conversation = mongoose.model("Conversation",conversationSchema);
export default Conversation;