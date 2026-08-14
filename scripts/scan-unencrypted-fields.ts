/**
 * Finds sensitive fields stored as plaintext instead of iv:authTag:ciphertext.
 * Run: npx ts-node scripts/scan-unencrypted-fields.ts
 */
import prisma from "../src/config/database"
import { isEncrypted } from "../src/shared/utils/encryption"

type Finding = { table: string; id: string; field: string; preview: string }

const check = (table: string, id: string, field: string, value: string | null | undefined, findings: Finding[]) => {
  if (value && !isEncrypted(value)) {
    findings.push({
      table,
      id,
      field,
      preview: value.length > 60 ? `${value.slice(0, 60)}…` : value,
    })
  }
}

const main = async () => {
  const findings: Finding[] = []

  for (const record of await prisma.medicalRecord.findMany()) {
    check("MedicalRecord", record.id, "diagnosis", record.diagnosis, findings)
    check("MedicalRecord", record.id, "symptoms", record.symptoms, findings)
    check("MedicalRecord", record.id, "treatment", record.treatment, findings)
    check("MedicalRecord", record.id, "notes", record.notes, findings)
  }

  for (const prescription of await prisma.prescription.findMany()) {
    check("Prescription", prescription.id, "medication", prescription.medication, findings)
    check("Prescription", prescription.id, "dosage", prescription.dosage, findings)
    check("Prescription", prescription.id, "frequency", prescription.frequency, findings)
    check("Prescription", prescription.id, "duration", prescription.duration, findings)
    check("Prescription", prescription.id, "instructions", prescription.instructions, findings)
  }

  for (const result of await prisma.labResult.findMany()) {
    check("LabResult", result.id, "resultData", result.resultData, findings)
    check("LabResult", result.id, "interpretation", result.interpretation, findings)
  }

  for (const patient of await prisma.patient.findMany()) {
    check("Patient", patient.id, "allergies", patient.allergies, findings)
    check("Patient", patient.id, "insurancePolicyNumber", patient.insurancePolicyNumber, findings)
  }

  if (findings.length === 0) {
    console.log("No plaintext sensitive fields found.")
    return
  }

  console.log(`Found ${findings.length} plaintext field(s):\n`)
  for (const f of findings) {
    console.log(`  ${f.table}  ${f.id}  ${f.field}: "${f.preview}"`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
