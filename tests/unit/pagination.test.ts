import { getPagination, getTotalPages } from "../../src/shared/utils/pagination"

describe("Pagination utility", () => {
  describe("getPagination", () => {
    it("should return defaults when no query params", () => {
      const result = getPagination({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.skip).toBe(0)
    })

    it("should calculate skip correctly for page 2", () => {
      const result = getPagination({ page: "2", limit: "10" })
      expect(result.skip).toBe(10)
    })

    it("should calculate skip correctly for page 3", () => {
      const result = getPagination({ page: "3", limit: "10" })
      expect(result.skip).toBe(20)
    })

    it("should cap limit at 100", () => {
      const result = getPagination({ limit: "999" })
      expect(result.limit).toBe(100)
    })

    it("should default to page 1 for invalid page", () => {
      const result = getPagination({ page: "invalid" })
      expect(result.page).toBe(1)
    })
  })

  describe("getTotalPages", () => {
    it("should calculate total pages correctly", () => {
      expect(getTotalPages(47, 10)).toBe(5)
      expect(getTotalPages(40, 10)).toBe(4)
      expect(getTotalPages(1, 10)).toBe(1)
    })

    it("should round up for partial pages", () => {
      expect(getTotalPages(11, 10)).toBe(2)
      expect(getTotalPages(1, 10)).toBe(1)
    })

    it("should return 0 for empty results", () => {
      expect(getTotalPages(0, 10)).toBe(0)
    })
  })
})