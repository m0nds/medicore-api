-- This is an empty migration.-- Prevent any UPDATE or DELETE on AuditLog table
-- This enforces immutability at the database level
-- Even direct database access cannot modify audit logs

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog records are immutable and cannot be modified or deleted. This action has been logged.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();