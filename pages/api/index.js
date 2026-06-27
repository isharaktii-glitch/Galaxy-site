// pages/api/index.js
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const sql = neon(process.env.DATABASE_URL);
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

// Helper to parse cookies and verify JWT
function authenticate(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  if (!cookies.token) return null;
  try {
    return jwt.verify(cookies.token, JWT_SECRET);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const { method, url } = req;
  const path = url.split('?')[0];
  const user = authenticate(req);

  // ---------- AUTH ----------
  if (path === '/api/register') {
    if (method !== 'POST') return res.status(405).end();
    const { role, first_name, last_name, address, phone, whatsapp, email, username, password } = req.body;
    if (!role || !email || !username || !password) return res.status(400).json({error:'Missing fields'});
    const hash = await bcrypt.hash(password, 10);
    try {
      await sql`INSERT INTO users (role,first_name,last_name,address,phone,whatsapp,email,username,password_hash) 
                VALUES (${role},${first_name},${last_name},${address},${phone},${whatsapp},${email},${username},${hash})`;
      return res.json({success:true});
    } catch (e) {
      return res.status(400).json({error:'Username/email exists'});
    }
  }
  if (path === '/api/login') {
    if (method !== 'POST') return res.status(405).end();
    const { login, password } = req.body;
    const user = await sql`SELECT * FROM users WHERE email=${login} OR username=${login}`;
    if (user.length === 0) return res.status(401).json({error:'Invalid credentials'});
    const valid = await bcrypt.compare(password, user[0].password_hash);
    if (!valid) return res.status(401).json({error:'Invalid credentials'});
    const token = jwt.sign({ id: user[0].id, role: user[0].role }, JWT_SECRET, { expiresIn: '7d' });
    res.setHeader('Set-Cookie', cookie.serialize('token', token, { httpOnly: true, maxAge: 604800, path: '/' }));
    return res.json({ success: true, role: user[0].role });
  }
  if (path === '/api/forgot') {
    // Simple demo: reset using email, send OTP (not implemented fully)
    return res.json({message:'Reset link sent (demo)'});
  }

  // ---------- ADMIN ONLY ----------
  if (user && user.role === 'admin') {
    if (path === '/api/admin/users') {
      const users = await sql`SELECT id,role,first_name,last_name,email,username,phone,whatsapp,kyc_verified FROM users WHERE role!='admin'`;
      return res.json(users);
    }
    if (path === '/api/admin/products') {
      const products = await sql`SELECT p.*, u.username FROM products p JOIN users u ON p.seller_id=u.id`;
      return res.json(products);
    }
    if (path === '/api/admin/orders') {
      const orders = await sql`SELECT o.*, b.username as buyer, s.username as seller FROM orders o
                                JOIN users b ON o.buyer_id=b.id JOIN users s ON o.seller_id=s.id`;
      return res.json(orders);
    }
    if (path === '/api/admin/commission') {
      if (method === 'POST') {
        const { type, percent } = req.body; // type: 'customer' or 'seller'
        // Store commission in a settings table (simplified)
        await sql`INSERT INTO settings (key,value) VALUES (${'comm_'+type},${percent}) ON CONFLICT (key) DO UPDATE SET value=${percent}`;
        return res.json({success:true});
      }
      const comm = await sql`SELECT * FROM settings WHERE key LIKE 'comm_%'`;
      return res.json(comm);
    }
    if (path === '/api/admin/announcement') {
      if (method === 'POST') {
        const { message, receiver_id } = req.body; // receiver_id null=all, else specific user id
        await sql`INSERT INTO announcements (sender_id,receiver_id,message) VALUES (${user.id},${receiver_id||null},${message})`;
        return res.json({success:true});
      }
    }
    if (path === '/api/admin/payment-requests') {
      const prs = await sql`SELECT pr.*, u.username FROM payment_requests pr JOIN users u ON pr.seller_id=u.id WHERE pr.status='pending'`;
      return res.json(prs);
    }
    if (path === '/api/admin/pay') {
      if (method === 'POST') {
        const { request_id } = req.body;
        await sql`UPDATE payment_requests SET status='paid' WHERE id=${request_id}`;
        return res.json({success:true});
      }
    }
  }

  // ---------- SELLER / CUSTOMER ----------
  if (user && (user.role === 'seller' || user.role === 'customer')) {
    if (path === '/api/me') {
      const u = await sql`SELECT * FROM users WHERE id=${user.id}`;
      return res.json(u[0]);
    }
    if (path === '/api/add-product') {
      if (method !== 'POST') return res.status(405).end();
      const { title, description, price, image_url, category } = req.body;
      await sql`INSERT INTO products (seller_id,title,description,price,image_url,category) 
                VALUES (${user.id},${title},${description},${price},${image_url},${category})`;
      return res.json({success:true});
    }
    if (path === '/api/my-products') {
      const prods = await sql`SELECT * FROM products WHERE seller_id=${user.id}`;
      return res.json(prods);
    }
    if (path === '/api/orders') {
      // For seller: orders assigned, for customer: orders placed
      let orders;
      if (user.role === 'seller') {
        orders = await sql`SELECT o.*, u.username as buyer FROM orders o JOIN users u ON o.buyer_id=u.id WHERE o.seller_id=${user.id}`;
      } else {
        orders = await sql`SELECT o.*, u.username as seller FROM orders o JOIN users u ON o.seller_id=u.id WHERE o.buyer_id=${user.id}`;
      }
      return res.json(orders);
    }
    if (path === '/api/order-action') {
      if (method !== 'POST') return res.status(405).end();
      const { order_id, action } = req.body; // approve, reject, done, buyer_approve, payment_done
      const order = (await sql`SELECT * FROM orders WHERE id=${order_id}`)[0];
      if (!order) return res.status(404).end();
      // authorisation checks
      if (user.role === 'seller') {
        if (action === 'approve') await sql`UPDATE orders SET status='approved' WHERE id=${order_id}`;
        else if (action === 'reject') await sql`UPDATE orders SET status='rejected' WHERE id=${order_id}`;
        else if (action === 'done') await sql`UPDATE orders SET seller_done=TRUE WHERE id=${order_id}`;
      } else if (user.role === 'customer') {
        if (action === 'buyer_approve') await sql`UPDATE orders SET buyer_approve=TRUE WHERE id=${order_id}`;
        else if (action === 'payment_done') {
          const { receipt_url } = req.body;
          await sql`UPDATE orders SET payment_done=TRUE, receipt_url=${receipt_url} WHERE id=${order_id}`;
        }
      }
      return res.json({success:true});
    }
    if (path === '/api/request-payment') {
      if (method !== 'POST' || user.role !== 'seller') return res.status(403).end();
      const { amount, bank_name, bank_acc_no } = req.body;
      await sql`INSERT INTO payment_requests (seller_id,amount,bank_name,bank_acc_no) VALUES (${user.id},${amount},${bank_name},${bank_acc_no})`;
      return res.json({success:true});
    }
  }

  // ---------- PUBLIC ----------
  if (path === '/api/products') {
    const products = await sql`SELECT p.*, u.username as seller FROM products p JOIN users u ON p.seller_id=u.id WHERE p.status='active'`;
    return res.json(products);
  }
  if (path === '/api/place-order') {
    if (method !== 'POST' || !user) return res.status(401).end();
    const { product_id, quantity, seller_id } = req.body;
    const product = (await sql`SELECT * FROM products WHERE id=${product_id}`)[0];
    if (!product) return res.status(404).end();
    const total = product.price * (quantity || 1);
    await sql`INSERT INTO orders (buyer_id,seller_id,product_id,quantity,total_price) 
              VALUES (${user.id},${seller_id},${product_id},${quantity||1},${total})`;
    return res.json({success:true});
  }

  return res.status(404).json({error:'Not found'});
}
