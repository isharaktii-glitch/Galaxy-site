import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export async function POST(req) {
  const { email, username, password, firstName, lastName, address, phone, whatsapp, role } = await req.json()
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, username, password: hashed, firstName, lastName, address, phone, whatsapp, role: role || 'BUYER' }
  })
  const token = signToken({ id: user.id, role: user.role })
  return NextResponse.json({ token, user })
}
