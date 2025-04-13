import { NextResponse } from 'next/server'
import { compare } from 'bcrypt'

// In a real application, you would use a database to store and retrieve user information
const users = [
  { id: 1, email: 'user@example.com', password: '12345' }, // password: 'password123'
]

export async function POST(request: Request) {
  const { email, password } = await request.json()

  // Find user by email
  const user = users.find(u => u.email === email)

  if (!user) {
    return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
  }

  // Compare password
  const passwordMatch = await compare(password, user.password)

  if (!passwordMatch) {
    return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
  }

  // In a real application, you would generate and return a JWT token here
  return NextResponse.json({ message: 'Login successful', userId: user.id }, { status: 200 })
}

