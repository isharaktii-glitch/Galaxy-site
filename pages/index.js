// pages/index.js
import { useState, useEffect } from 'react';

const LANGUAGES = {
  si: { /* Sinhala translations */ },
  ta: { /* Tamil translations */ },
  en: { /* English translations */ }
};

export default function Home() {
  const [lang, setLang] = useState('si');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login'); // login,register,dashboard,admin,products,orders...
  const [form, setForm] = useState({});

  useEffect(() => { fetch('/api/me').then(r=>r.json()).then(d=>{ if(d.id) setUser(d); else setPage('login') }) }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
    if (res.ok) setPage('login');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
    if (res.ok) { const data = await res.json(); setUser({role:data.role}); setPage(data.role==='admin'?'admin':'dashboard'); }
  };

  // ... UI rendering based on page state, admin panel, seller/customer dashboards, 3D effects, language switch, etc.
  return (
    <div style={{ /* 3D backgrounds, gradient layers */ }}>
      <select onChange={e=>setLang(e.target.value)}>
        <option value="si">සිංහල</option>
        <option value="ta">தமிழ்</option>
        <option value="en">English</option>
      </select>
      {page === 'login' && <LoginForm />}
      {page === 'register' && <RegisterForm />}
      {page === 'admin' && <AdminPanel />}
      {page === 'dashboard' && <Dashboard />}
      {/* ... */}
    </div>
  );
}
