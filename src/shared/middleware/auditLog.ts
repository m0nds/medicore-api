import prisma from "../../config/database"
import logger from "../../config/logger"

export const createAuditLog = async (
  actorId: string,
  action: "VIEW" | "CREATE" | "UPDATE" | "DELETE",
  resource: string,
  resourceId: string,
  details?: string,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    // audit log failure should NEVER crash the main request
    // log the error but don't throw
    logger.error({ error }, "Failed to create audit log")
  }
}