import redis from "../../config/redis"
import logger from "../../config/logger"

const DEFAULT_TTL = 300 // 5 minutes in seconds

export const getCache = async <T>(key: string): Promise<T | null> => {
    try {
        const cached = await redis.get(key)
        if(cached) {
            logger.info({key}, "Cache hit")
            return JSON.parse(cached) as T
        }
        logger.info({key}, "Cache miss")
        return null
    } catch (error) {
        logger.error({error, key}, "Cache get error")
        return null
    }
}

export const setCache = async (key: string, data: unknown, ttl = DEFAULT_TTL): Promise<void> => {
    try {
      await redis.set(key, JSON.stringify(data), "EX", ttl)
    } catch (error) {
      logger.error({ error, key }, "Cache set error")
    }
  }
  

export const deleteCache = async (key: string): Promise<void> => {
    try {
        await redis.del(key)
        logger.info({ key }, "Cache invalidated")
    } catch (error) {
        logger.error({ error, key }, "Cache delete error")
    }
}

export const deleteCachePattern = async (pattern: string): Promise<void> => {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
        logger.info({ pattern, count: keys.length }, "Cache pattern invalidated")
      }
    } catch (error) {
      logger.error({ error, pattern }, "Cache pattern delete error")
    }
  }