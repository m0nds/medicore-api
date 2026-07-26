import { execSync } from "child_process"
import { config } from "dotenv"

config() // load .env before anything else

export default async function globalSetup() {
  console.log("Running migrations on test database...")
  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL
    },
    stdio: "inherit"
  })
  console.log("Test database ready")
}