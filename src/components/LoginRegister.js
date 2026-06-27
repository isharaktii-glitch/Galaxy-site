'use client'
import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function LoginRegister({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ email: '', username: '', password: '', firstName: '', lastName: '', address: '', phone: '', whatsapp: '', role: 'BUYER' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin ? { login: form.email || form.username, password: form.password } : form
      const { data } = await axios.post(endpoint, body)
      onLogin(data.token, data.user.role)
      toast.success(isLogin ? 'Logged in' : 'Registered')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-black relative">
      <div className="absolute inset-0 z-0"><ThreeScene /></div>
      <div className="bg-white/10 backdrop-blur p-8 rounded-xl z-10 max-w-md w-full">
        <h2 className="text-3xl text-white mb-6">{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input placeholder="First Name" required onChange={e => setForm({...form, firstName: e.target.value})} className="input" />
              <input placeholder="Last Name" required onChange={e => setForm({...form, lastName: e.target.value})} className="input" />
              <input placeholder="Address" onChange={e => setForm({...form, address: e.target.value})} className="input" />
              <input placeholder="Phone" onChange={e => setForm({...form, phone: e.target.value})} className="input" />
              <input placeholder="WhatsApp" onChange={e => setForm({...form, whatsapp: e.target.value})} className="input" />
              <select onChange={e => setForm({...form, role: e.target.value})} className="input">
                <option value="BUYER">Buyer</option>
                <option value="SELLER">Seller</option>
              </select>
            </>
          )}
          <input placeholder="Email or Username" required onChange={e => setForm({...form, email: e.target.value, username: e.target.value})} className="input" />
          <input type="password" placeholder="Password" required onChange={e => setForm({...form, password: e.target.value})} className="input" />
          <button type="submit" className="bg-blue-600 w-full py-2 rounded">{isLogin ? 'Login' : 'Register'}</button>
        </form>
        <p className="text-white mt-4 cursor-pointer" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have account? Register" : "Have account? Login"}
        </p>
      </div>
    </div>
  )
}
// CSS for inputs in globals.css: .input { @apply w-full p-2 rounded bg-white/20 text-white placeholder-white/70 }
