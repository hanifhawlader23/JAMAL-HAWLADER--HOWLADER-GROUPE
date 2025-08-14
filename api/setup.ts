import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

export default async function GET(request: Request) {
  // Explicitly check for the database connection URL to prevent crashes.
  if (!process.env.POSTGRES_URL) {
    return new Response(
      JSON.stringify({ error: "Database connection string is not configured. Please set the POSTGRES_URL environment variable in your Vercel project settings." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    let result;
    
    // Create Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Create Clients table
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        email VARCHAR(255),
        phone VARCHAR(50),
        vat_number VARCHAR(100),
        logo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create Products table
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100),
        model_name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        category VARCHAR(100),
        reference VARCHAR(255) NOT NULL,
        description TEXT,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create Entries table
    await sql`
      CREATE TABLE IF NOT EXISTS entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) NOT NULL UNIQUE,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        who_input VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        items JSONB,
        invoice_id UUID, -- This will be a reference, not a formal foreign key yet
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create Deliveries table
    await sql`
      CREATE TABLE IF NOT EXISTS deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_code VARCHAR(100) NOT NULL,
        delivery_date TIMESTAMP WITH TIME ZONE NOT NULL,
        who_delivered VARCHAR(255) NOT NULL,
        items JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create Documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_number VARCHAR(100) NOT NULL UNIQUE,
        document_type VARCHAR(50) NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        entry_ids UUID[],
        items JSONB,
        subtotal NUMERIC(12, 2) NOT NULL,
        surcharges JSONB,
        tax_rate NUMERIC(5, 2) NOT NULL,
        tax_amount NUMERIC(12, 2) NOT NULL,
        total NUMERIC(12, 2) NOT NULL,
        payment_status VARCHAR(50) NOT NULL,
        payments JSONB,
        invoice_period_start TIMESTAMP WITH TIME ZONE,
        invoice_period_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create Company Details table
    await sql`
      CREATE TABLE IF NOT EXISTS company_details (
        id INT PRIMARY KEY DEFAULT 1,
        name VARCHAR(255),
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        vat_number VARCHAR(100),
        logo_url TEXT
      );
    `;
    
    // Seed initial admin users
    const hashedPassword = await bcrypt.hash('password', 10);
    await sql`
      INSERT INTO users (username, password, role, full_name)
      VALUES 
        ('admin@hawlader.eu', ${hashedPassword}, 'admin', 'Admin Hawlader'),
        ('hanif@hawlader.eu', ${hashedPassword}, 'admin', 'Hanif Hawlader')
      ON CONFLICT (username) DO NOTHING;
    `;

    await sql`
      INSERT INTO company_details (id, name, address, email)
      SELECT 1, 'My Textile Company', '123 Textile Avenue, Dhaka', 'contact@example.com'
      WHERE NOT EXISTS (SELECT 1 FROM company_details);
    `;

    result = { message: "Database tables created and seeded with admin users successfully." };
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("Database setup error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}