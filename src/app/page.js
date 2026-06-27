'use client'
import { useState, useEffect } from 'react'
import LoginRegister from '@/components/LoginRegister'
import AdminPanel from '@/components/AdminPanel'
import SellerPanel from '@/components/SellerPanel'
import BuyerPanel from '@/components/BuyerPanel'
import ThreeScene from '@/components/ThreeScene'

export default function Home() {
  const [token, setToken] = useState(null)
  const [role, setRole] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (stored) {
      setToken(stored)
      const payload = JSON.parse(atob(stored.split('.')[1]))
      setRole(payload.role)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setRole(null)
  }

  if (!token) return <LoginRegister onLogin={(t, r) => { setToken(t); setRole(r); localStorage.setItem('token', t); }} />

  return (
    <div className="relative">
      <ThreeScene />
      <nav className="relative z-10 flex justify-between p-4 bg-black/50">
        <h1 className="text-2xl font-bold">Galaxy Workers</h1>
        <button onClick={logout} className="bg-red-500 px-4 py-2 rounded">Logout</button>
      </nav>
      <main className="relative z-10 p-4">
        {role === 'ADMIN' && <AdminPanel />}
        {role === 'SELLER' && <SellerPanel />}
        {role === 'BUYER' && <BuyerPanel />}
      </main>
    </div>
  )
}
