// pages/index.js
import { useState, useEffect } from 'react';

const LANG = {
  si: { login: 'පිවිසෙන්න', register: 'ලියාපදිංචි වන්න', email: 'ඊ-තැපෑල', username: 'පරිශීලක නාමය', password: 'මුරපදය', forgot: 'මුරපදය අමතකද?' },
  en: { login: 'Login', register: 'Register', email: 'Email', username: 'Username', password: 'Password', forgot: 'Forgot Password?' },
  ta: { login: 'உள்நுழைய', register: 'பதிவு', email: 'மின்னஞ்சல்', username: 'பயனர்பெயர்', password: 'கடவுச்சொல்', forgot: 'கடவுச்சொல் மறந்தீர்களா?' },
};

export default function Home() {
  const [lang, setLang] = useState('si');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login'); // login, register, dashboard, admin
  const [form, setForm] = useState({});
  const t = LANG[lang];

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.role) { setUser(d); setPage(d.role === 'admin' ? 'admin' : 'dashboard'); }
      else setPage('login');
    });
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, role: 'customer' }) });
    setPage('login');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) {
      const data = await res.json();
      setUser({ role: data.role });
      setPage(data.role === 'admin' ? 'admin' : 'dashboard');
    } else alert('Login failed');
  };

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' }); // simple API to clear cookie (can be added)
    setUser(null);
    setPage('login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1e2f, #2d2d44)', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <h1>🌌 Galaxy Workers</h1>
        <select value={lang} onChange={e => setLang(e.target.value)}>
          <option value="si">සිංහල</option>
          <option value="ta">தமிழ்</option>
          <option value="en">English</option>
        </select>
        {user && <button onClick={logout}>Logout</button>}
      </div>

      {page === 'login' && (
        <form onSubmit={handleLogin} style={{ maxWidth: 400, margin: '2rem auto', background: '#2d2d44', padding: '2rem', borderRadius: 10 }}>
          <h2>{t.login}</h2>
          <input placeholder={t.email} onChange={e => setForm({ ...form, login: e.target.value })} required />
          <input type="password" placeholder={t.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <button type="submit">{t.login}</button>
          <p onClick={() => setPage('register')}>{t.register}</p>
          <p onClick={() => alert('Demo: link sent')}>{t.forgot}</p>
        </form>
      )}

      {page === 'register' && (
        <form onSubmit={handleRegister} style={{ maxWidth: 400, margin: '2rem auto', background: '#2d2d44', padding: '2rem', borderRadius: 10 }}>
          <h2>{t.register}</h2>
          <input placeholder="First Name" onChange={e => setForm({ ...form, first_name: e.target.value })} />
          <input placeholder="Last Name" onChange={e => setForm({ ...form, last_name: e.target.value })} />
          <input placeholder="Address" onChange={e => setForm({ ...form, address: e.target.value })} />
          <input placeholder="Phone" onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="WhatsApp" onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
          <input placeholder={t.email} type="email" onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input placeholder={t.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          <input type="password" placeholder={t.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <button type="submit">{t.register}</button>
        </form>
      )}

      {page === 'dashboard' && user?.role !== 'admin' && (
        <Dashboard user={user} />
      )}
      {page === 'admin' && user?.role === 'admin' && (
        <AdminPanel />
      )}
    </div>
  );
}

function Dashboard({ user }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>පාරිභෝගික / විකුණුම්කරු Dashboard</h2>
      <p>Welcome, {user?.role}. Full feature එකතු කිරීමට code extend කරන්න.</p>
      {/* Product list, orders, payment request buttons can be added here */}
    </div>
  );
}

function AdminPanel() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Panel</h2>
      <p>Users, Products, Orders management...</p>
      {/* Admin features will be added progressively */}
    </div>
  );
}
