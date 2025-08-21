import express from 'express';
import cors from 'cors';
import http from "http";
import { Server } from 'socket.io';
import dotenv from "dotenv";
import { connectionDB } from './lib/db.js';
import userRoute from './routes/userRoutes.js';
import messageRouter from './routes/messageRouter.js';
import conversationRouter from './routes/conversationRoute.js';
import callRouters from './routes/callRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
    cors: { origin: "*" }
});

export const userSocketMap = {};

await connectionDB();

app.use(express.json({ limit: "4mb" }));
app.use(cors());

const handleConnection = (socket) => {
    const userId = socket.handshake.query.userId;
    console.log("User Connected", userId);

    if (userId) {
        userSocketMap[userId] = socket.id;
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
};

const handleDisconnect = (socket) => {
    const userId = socket.handshake.query.userId;
    console.log("User Disconnected", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
};

io.on("connection", (socket) => {
    handleConnection(socket);
    
    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
});

app.post('/api/status', (req, res) => {
    console.log("Server is live");
    res.json("Server is live");
});

app.use("/api/auth", userRoute);
app.use("/api/messages", messageRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/calls", callRouters);

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default server;
