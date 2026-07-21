import { Request, Response } from "express"
import { asyncHandler } from "../../shared/utils/asyncHandler"
import { sendPaginated } from "../../shared/utils/apiResponse"
import { getPagination, getTotalPages } from "../../shared/utils/pagination"
import prisma from "../../config/database"

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req.query)

    const { actorId, resource, action, resourceId } = req.query

    const where = {
        ...(actorId && { actorId: actorId as string }),
        ...(resource && { resource: resource as string }),
        ...(action && { action: action as "VIEW" | "CREATE" | "UPDATE" | "DELETE" }),
        ...(resourceId && { resourceId: resourceId as string })
      }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                actor: { select: { name: true, email: true, role: true } }
            }
        }),
        prisma.auditLog.count({ where })
    ])

    sendPaginated(res, logs, {
        page,
        limit,
        total,
        totalPages: getTotalPages(total, limit)
    })
})