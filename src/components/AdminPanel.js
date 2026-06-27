'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [commissions, setCommissions] = useState({})
  const token = localStorage.getItem('token')

  const fetchUsers = async () => {
    const { data } = await axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
    setUsers(data)
  }

  const globalCommission = async () => {
    const newComm = prompt('Enter global profit %')
    await axios.put('/api/admin/commissions', { global: parseFloat(newComm) }, { headers: { Authorization: `Bearer ${token}` } })
    alert('Updated')
  }

  // Similar for products, announcements...
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <section className="bg-gray-800 p-4 rounded">
        <h3>Users</h3>
        <button onClick={fetchUsers}>Load</button>
        {/* table */}
      </section>
      <section className="bg-gray-800 p-4 rounded">
        <h3>Commissions</h3>
        <button onClick={globalCommission}>Set Global %</button>
        {/* per product edit */}
      </section>
      <section className="bg-gray-800 p-4 rounded">
        <h3>Announcements</h3>
        {/* send to all, sellers, specific */}
      </section>
    </div>
  )
}
