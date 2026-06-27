export async function POST(req) {
  // Send reset email via nodemailer / sendgrid
  return Response.json({ message: 'If account exists, reset email sent' })
}
