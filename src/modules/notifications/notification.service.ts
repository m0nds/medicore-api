import prisma from "../../config/database"
import { getPagination } from "../../shared/utils/pagination"
import redis from "../../config/redis"
import { NotificationType } from "@prisma/client"

export const sendNotification = async (userId: string, type: NotificationType, title: string, message: string, appointmentId?: string) => {
    // 1. Save to database (persistent — user sees it even after reconnect)
    const notification = await prisma.notification.create({
        data: {
            userId,
            type,
            title,
            message,
            appointmentId: appointmentId ?? null
        }
    })
    // 2. Publish to Redis so Socket.io picks it up
    await redis.publish("notifications", JSON.stringify({
        userId,
        notification
    }))

    return notification
}

export const getMynotifications = async (userId: string, query: Record<string, unknown>) => {
    const { limit, skip, page } = getPagination(query)

    const [notification, total] = await Promise.all([
        prisma.notification.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" }
        }),
        prisma.notification.count({ where: { userId } })
    ])

    return { notification, total, page, limit }
}

export const markAsRead = async (notificationId: string, userId: string) => {
    return prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() }
    })
}

export const markAllAsRead = async (userId: string) => {
    return prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() }
    })
}