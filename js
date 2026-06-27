const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Neon Database සම්බන්ධතාවය (Vercel Env Variables මගින් ගනී)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- AUTHENTICATION & REGISTRATION ---
app.post('/api/register', async (req, res) => {
  const { username, email, password, role, phone } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, email, password, role, phone]
    );
    res.status(201).json({ message: "ලියාපදිංචිය සාර්ථකයි. කරුණාකර OTP සහ KYC සම්පූර්ණ කරන්න.", userId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// KYC සහ OTP Verification (Mockup)
app.post('/api/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;
  if(otp === "1234") { // සරල OTP පරීක්ෂාවක්
    await pool.query('UPDATE users SET is_phone_verified = true WHERE id = $1', [userId]);
    return res.json({ message: "දුරකථන අංකය තහවුරු කලා!" });
  }
  res.status(400).json({ error: "වැරදි OTP අංකයක්" });
});

app.post('/api/upload-kyc', async (req, res) => {
  const { userId, idPhoto, facePhoto } = req.body;
  await pool.query('UPDATE users SET kyc_id_photo = $1, kyc_face_photo = $2, kyc_status = \'pending\' WHERE id = $1', [idPhoto, facePhoto]);
  res.json({ message: "KYC ලේඛන ලැබුණා. Admin අනුමත කරන තෙක් සිටින්න." });
});

// --- ADMIN PANELS OPERATIONS ---
// සියලුම පරිශීලකයින් වෙන් වෙන්ව බැලීම
app.get('/api/admin/users/:role', async (req, res) => {
  const result = await pool.query('SELECT id, username, email, kyc_status, phone, bank_name, account_no FROM users WHERE role = $1', [req.params.role]);
  res.json(result.rows);
});

// පරිශීලකයෙකු ඉවත් කිරීම (Cancel Registration)
delete app.delete('/api/admin/users/:id', async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: "පරිශීලකයා පද්ධතියෙන් ඉවත් කලා." });
});

// 100% කින් හෝ ඕනෑම එක සැරේ සියලුම භාණ්ඩවල Admin මිල ප්‍රතිශතය වෙනස් කිරීම
app.post('/api/admin/bulk-markup', async (req, res) => {
  const { percent } = req.body;
  await pool.query('UPDATE products SET admin_markup_percent = $1', [percent]);
  res.json({ message: "සියලුම භාණ්ඩවල Admin ලාභ ප්‍රතිශතය යාවත්කාලීන කලා." });
});

// සියලුම සේලර්ලගේ ලාභය එක සැරේ වෙනස් කිරීම
app.post('/api/admin/bulk-seller-markup', async (req, res) => {
  const { percent } = req.body;
  await pool.query('UPDATE products SET seller_markup_percent = $1', [percent]);
  res.json({ message: "සියලුම සේලර්ලගේ ලාභ ප්‍රතිශතය එක සැරේ වෙනස් කලා." });
});

// තනි භාණ්ඩයක මිල වෙනස් කිරීම
app.put('/api/admin/product/:id', async (req, res) => {
  const { admin_markup, seller_markup } = req.body;
  await pool.query('UPDATE products SET admin_markup_percent = $1, seller_markup_percent = $2 WHERE id = $3', [admin_markup, seller_markup, req.params.id]);
  res.json({ message: "භාණ්ඩයේ මිල සැකසුම් වෙනස් කලා." });
});

// Category එකතු කිරීම
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  await pool.query('INSERT INTO categories (name) VALUES ($1)', [name]);
  res.json({ message: "නව Category එකක් සාදන ලදී." });
});

// Payout Requests (බැංකු විස්තර උඩට එන ලෙස පැරණි ඒවා පිළිවෙලට)
app.get('/api/admin/payouts', async (req, res) => {
  const result = await pool.query(`
    SELECT p.id, u.username, u.bank_name, u.account_no, p.amount, p.status 
    FROM payout_requests p 
    JOIN users u ON p.user_id = u.id 
    ORDER BY p.status DESC, p.requested_at DESC`);
  res.json(result.rows);
});

// --- PRODUCT & ORDER MANAGEMENT ---
// භාණ්ඩ ඇතුළත් කිරීම (Admin හෝ Customer හට හැකියි)
app.post('/api/products', async (req, res) => {
  const { title, description, base_price, category_id, listed_by } = req.body;
  await pool.query('INSERT INTO products (title, description, base_price, category_id, listed_by) VALUES ($1, $2, $3, $4, $5)', 
  [title, description, base_price, category_id, listed_by]);
  res.json({ message: "භාණ්ඩය සාර්ථකව ඇතුළත් කලා." });
});

// භාණ්ඩ ලැයිස්තුව (මිල සූත්‍රය ගණනය කර පෙන්වීම)
app.get('/api/products', async (req, res) => {
  const result = await pool.query('SELECT * FROM products');
  const calculatedProducts = result.rows.map(p => {
    const base = parseFloat(p.base_price);
    const adminPrice = base + (base * (parseFloat(p.admin_markup_percent) / 100));
    const finalPrice = adminPrice + (adminPrice * (parseFloat(p.seller_markup_percent) / 100));
    return { ...p, admin_calculated_price: adminPrice, final_market_price: finalPrice };
  });
  res.json(calculatedProducts);
});

// Order එකක් දැමීම
app.post('/api/orders', async (req, res) => {
  const { product_id, buyer_id, seller_id } = req.body;
  await pool.query('INSERT INTO orders (product_id, buyer_id, seller_id) VALUES ($1, $2, $3)', [product_id, buyer_id, seller_id]);
  res.json({ message: "ඇණවුම සාර්ථකව යොමු කලා." });
});

// Order තත්ත්ව වෙනස් කිරීම (Approve / Reject / Done)
app.put('/api/orders/:id/status', async (req, res) => {
  const { status, reject_reason } = req.body;
  await pool.query('UPDATE orders SET status = $1, reject_reason = $2 WHERE id = $3', [status, reject_reason, req.params.id]);
  res.json({ message: `ඇණවුම ${status} තත්ත්වයට පත් කරන ලදී.` });
});

// Customer විසින් Receipt එක දැමීම
app.post('/api/orders/:id/receipt', async (req, res) => {
  const { receiptUrl } = req.body;
  await pool.query('UPDATE orders SET payment_receipt_url = $1, payment_status = \'paid\' WHERE id = $2', [receiptUrl, req.params.id]);
  res.json({ message: "ගෙවීම් රිසිට්පත සාර්ථකව යොමු කලා. Admin පරීක්ෂා කරනු ඇත." });
});

// Seller බැංකු විස්තර දමා මුදල් ඉල්ලීම
app.post('/api/payout/request', async (req, res) => {
  const { userId, bank_name, account_no, amount } = req.body;
  await pool.query('UPDATE users SET bank_name = $1, account_no = $2 WHERE id = $3', [bank_name, account_no, userId]);
  await pool.query('INSERT INTO payout_requests (user_id, amount) VALUES ($1, $2)', [userId, amount]);
  res.json({ message: "මුදල් ලබාගැනීමේ ඉල්ලීම සාර්ථකව යොමු කලා." });
});

// --- ANNOUNCEMENTS ---
app.post('/api/announcements', async (req, res) => {
  const { target_role, target_user_id, message } = req.body;
  await pool.query('INSERT INTO announcements (target_role, target_user_id, message) VALUES ($1, $2, $3)', [target_role, target_user_id, message]);
  res.json({ message: "නිවේදනය සාර්ථකව යවන ලදී." });
});

app.get('/api/announcements/:role/:userId', async (req, res) => {
  const result = await pool.query('SELECT * FROM announcements WHERE target_role = \'all\' OR target_role = $1 OR target_user_id = $2 ORDER BY id DESC', [req.params.role, req.params.userId]);
  res.json(result.rows);
});

// Server එක පණ ගැන්වීම
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
