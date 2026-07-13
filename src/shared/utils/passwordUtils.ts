
import bcrypt from 'bcrypt'

export const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    return hashedPassword
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
   const comparedPassword = await bcrypt.compare(password, hash)
   return comparedPassword
}