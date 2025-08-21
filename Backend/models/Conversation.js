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
    },
  
    call: {
        status: {
            type: String,
            enum: ['none', 'ongoing', 'ended'],
            default: 'none'
        },
        startedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        startedAt: {
            type: Date,
            default: null
        },
        endedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        endedAt: {
            type: Date,
            default: null
        },
        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        roomId: {
            type: String,
            default: null
        }
    }
},{timestamps:true});

const Conversation = mongoose.model("Conversation",conversationSchema);
export default Conversation;
