import { Server as HttpServer } from "http"
import { Server as SocketServer } from "socket.io"
import redis from "../../config/redis"
import { verifyAccessToken } from "../auth/auth.jwt"
import logger from "../../config/logger"

// Map of userId → socketId
// So we can find which socket to send to
const userSockets = new Map<string, string>()

export const initializeSocket = (httpServer: HttpServer) => {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:8080",
            methods: ["GET", "POST"]
        }
    })

    logger.info("Socket.io ready") 

    // Auth middleware — verify JWT on connection
    io.use((socket, next) => {
        const token = socket.handshake.auth.token
        if (!token) {
            return next(new Error("Authentication required"))
        }
        try {
            const decoded = verifyAccessToken(token)
            if (typeof decoded === "string") {
                return next(new Error("Inavlid or expired token"))
            }
            socket.data.userId = decoded.sub 
            next()     
        } catch (error) {
            next(new Error("Invalid or expired token"))
        }
    })

    io.on("connection", (socket) => {
        const userId = socket.data.userId
        userSockets.set(userId, socket.id)
        logger.info({ userId }, "User connected via WebSocket")

        socket.on("disconnect", () => {
            userSockets.delete(userId)
            logger.info({ userId }, "User disconnected from WebSocket")
        })
    })

    // Subscribe to Redis notifications channel
    // When any server publishes a notification, this picks it up
    const subscriber = redis.duplicate()
    subscriber.subscribe("notifications", (err) => {
        if (err) logger.error({ err }, "Redis subscription error")
    })

    subscriber.on("message", (_channel, message) => {
        try {
            const { userId, notification } = JSON.parse(message)
            const socketId = userSockets.get(userId)
            if (socketId) {
                io.to(socketId).emit("notification", notification)
                logger.info({ userId }, "Notification delivered via Websocket")
            }
        } catch (error) {
            logger.error({ error }, "Failed to process notification")
        }
    })

    return io
}
