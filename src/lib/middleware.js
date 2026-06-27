import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request) {
  // Protect admin/seller APIs if needed
  return NextResponse.next()
}
