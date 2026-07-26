describe("Appointment status transitions", () => { 
  
    const VALID_TRANSITIONS: Record<string, string[]> = {
      SCHEDULED:   ["CONFIRMED", "CANCELLED"],
      CONFIRMED:   ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
      IN_PROGRESS: ["COMPLETED"],
      COMPLETED:   [],
      CANCELLED:   [],
      NO_SHOW:     []
    }
  
    const canTransition = (current: string, next: string): boolean => {
      return VALID_TRANSITIONS[current]?.includes(next) ?? false
    }
  
    it("should allow SCHEDULED → CONFIRMED", () => {
      expect(canTransition("SCHEDULED", "CONFIRMED")).toBe(true)
    })
  
    it("should allow CONFIRMED → IN_PROGRESS", () => {
      expect(canTransition("CONFIRMED", "IN_PROGRESS")).toBe(true)
    })
  
    it("should allow IN_PROGRESS → COMPLETED", () => {
      expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true)
    })
  
    it("should NOT allow SCHEDULED → COMPLETED (skipping steps)", () => {
      expect(canTransition("SCHEDULED", "COMPLETED")).toBe(false)
    })
  
    it("should NOT allow COMPLETED → CANCELLED (going back)", () => {
      expect(canTransition("COMPLETED", "CANCELLED")).toBe(false)
    })
  
    it("should NOT allow NO_SHOW → anything", () => {
      expect(canTransition("NO_SHOW", "CONFIRMED")).toBe(false)
      expect(canTransition("NO_SHOW", "CANCELLED")).toBe(false)
    })
  
    it("should allow CONFIRMED → NO_SHOW", () => {
      expect(canTransition("CONFIRMED", "NO_SHOW")).toBe(true)
    })
  
    it("should allow any active status → CANCELLED", () => {
      expect(canTransition("SCHEDULED", "CANCELLED")).toBe(true)
      expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true)
    })
  })