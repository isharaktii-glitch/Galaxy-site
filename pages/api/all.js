// pages/api/all.js
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const sql = neon(process.env.DATABASE_URL);
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

function authenticate(req) {
  const cks = cookie.parse(req.headers.cookie || '');
  if (!cks.token) return null;
  try { return jwt.verify(cks.token, JWT_SECRET); } catch { return null; }
}

export default async function handler(req, res) {
  const { method, url } = req;
  const path = url.split('?')[0];
  const user = authenticate(req);

  try {
    // ---- AUTH ----
    if (path === '/api/register' && method === 'POST') {
      const { role, first_name, last_name, address, phone, whatsapp, email, username, password } = req.body;
      const hash = await bcrypt.hash(password, 10);
      await sql`INSERT INTO users (role,first_name,last_name,address,phone,whatsapp,email,username,password_hash)
        VALUES (${role},${first_name},${last_name},${address},${phone},${whatsapp},${email},${username},${hash})`;
      return res.status(201).json({ success: true });
    }
    if (path === '/api/login' && method === 'POST') {
      const { login, password } = req.body;
      const [row] = await sql`SELECT * FROM users WHERE email=${login} OR username=${login}`;
      if (!row || !(await bcrypt.compare(password, row.password_hash)))
        return res.status(401).json({ error: 'Invalid' });
      const token = jwt.sign({ id: row.id, role: row.role }, JWT_SECRET, { expiresIn: '7d' });
      res.setHeader('Set-Cookie', cookie.serialize('token', token, { httpOnly: true, maxAge: 604800, path: '/' }));
      return res.json({ role: row.role });
    }
    if (path === '/api/forgot' && method === 'POST') {
      return res.json({ message: 'Reset link sent (demo)' });
    }

    // ---- USER ----
    if (path === '/api/me') {
      if (!user) return res.status(401).json({});
      const [u] = await sql`SELECT id,role,first_name,last_name,email,username FROM users WHERE id=${user.id}`;
      return res.json(u);
    }

    // ---- ADMIN ----
    if (user?.role === 'admin') {
      if (path === '/api/admin/users') {
        const rows = await sql`SELECT id,role,first_name,last_name,email,username,phone FROM users WHERE role!='admin'`;
        return res.json(rows);
      }
      if (path === '/api/admin/products') {
        const rows = await sql`SELECT p.*, u.username FROM products p JOIN users u ON p.seller_id=u.id`;
        return res.json(rows);
      }
      if (path === '/api/admin/orders') {
        const rows = await sql`SELECT o.*, b.username buyer, s.username seller FROM orders o
          JOIN users b ON o.buyer_id=b.id JOIN users s ON o.seller_id=s.id`;
        return res.json(rows);
      }
      if (path === '/api/admin/commission' && method === 'POST') {
        const { type, percent } = req.body; // 'customer' or 'seller'
        await sql`INSERT INTO settings (key,value) VALUES (${'comm_'+type},${percent})
          ON CONFLICT (key) DO UPDATE SET value=${percent}`;
        return res.json({ success: true });
      }
      if (path === '/api/admin/announcement' && method === 'POST') {
        const { message, receiver_id } = req.body;
        await sql`INSERT INTO announcements (sender_id,receiver_id,message) VALUES (${user.id},${receiver_id||null},${message})`;
        return res.json({ success: true });
      }
      if (path === '/api/admin/payment-requests') {
        const rows = await sql`SELECT pr.*, u.username FROM payment_requests pr JOIN users u ON pr.seller_id=u.id WHERE pr.status='pending'`;
        return res.json(rows);
      }
      if (path === '/api/admin/pay' && method === 'POST') {
        await sql`UPDATE payment_requests SET status='paid' WHERE id=${req.body.request_id}`;
        return res.json({ success: true });
      }
    }

    // ---- SELLER / CUSTOMER ----
    if (user && (user.role === 'seller' || user.role === 'customer')) {
      if (path === '/api/add-product' && method === 'POST') {
        const { title, description, price, image_url, category } = req.body;
        await sql`INSERT INTO products (seller_id,title,description,price,image_url,category)
          VALUES (${user.id},${title},${description},${price},${image_url},${category})`;
        return res.json({ success: true });
      }
      if (path === '/api/my-products') {
        const rows = await sql`SELECT * FROM products WHERE seller_id=${user.id}`;
        return res.json(rows);
      }
      if (path === '/api/orders') {
        let rows;
        if (user.role === 'seller')
          rows = await sql`SELECT o.*, u.username buyer FROM orders o JOIN users u ON o.buyer_id=u.id WHERE o.seller_id=${user.id}`;
        else
          rows = await sql`SELECT o.*, u.username seller FROM orders o JOIN users u ON o.seller_id=u.id WHERE o.buyer_id=${user.id}`;
        return res.json(rows);
      }
      if (path === '/api/order-action' && method === 'POST') {
        const { order_id, action } = req.body;
        if (user.role === 'seller') {
          if (action === 'approve') await sql`UPDATE orders SET status='approved' WHERE id=${order_id}`;
          else if (action === 'reject') await sql`UPDATE orders SET status='rejected' WHERE id=${order_id}`;
          else if (action === 'done') await sql`UPDATE orders SET seller_done=TRUE WHERE id=${order_id}`;
        } else {
          if (action === 'buyer_approve') await sql`UPDATE orders SET buyer_approve=TRUE WHERE id=${order_id}`;
          else if (action === 'payment_done') {
            const { receipt_url } = req.body;
            await sql`UPDATE orders SET payment_done=TRUE, receipt_url=${receipt_url} WHERE id=${order_id}`;
          }
        }
        return res.json({ success: true });
      }
      if (path === '/api/request-payment' && method === 'POST' && user.role === 'seller') {
        const { amount, bank_name, bank_acc_no } = req.body;
        await sql`INSERT INTO payment_requests (seller_id,amount,bank_name,bank_acc_no) VALUES (${user.id},${amount},${bank_name},${bank_acc_no})`;
        return res.json({ success: true });
      }
    }

    // ---- PUBLIC ----
    if (path === '/api/products') {
      const rows = await sql`SELECT p.*, u.username seller FROM products p JOIN users u ON p.seller_id=u.id WHERE p.status='active'`;
      return res.json(rows);
    }
    if (path === '/api/place-order' && method === 'POST' && user) {
      const { product_id, quantity, seller_id } = req.body;
      const [prod] = await sql`SELECT price FROM products WHERE id=${product_id}`;
      const total = prod.price * (quantity || 1);
      await sql`INSERT INTO orders (buyer_id,seller_id,product_id,quantity,total_price)
        VALUES (${user.id},${seller_id},${product_id},${quantity||1},${total})`;
      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Route not found' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
