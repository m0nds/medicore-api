// only load .env file in local development
if (!process.env.CI) {
    require('dotenv').config()
  }
  
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!
  process.env.NODE_ENV = "test"