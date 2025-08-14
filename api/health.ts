
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // This can run on the edge as it's a simple query

export default async function GET(request: Request) {
  try {
    // Explicitly check for the database connection URL to provide a better error message.
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "Database connection string is not configured.",
          message: "Please set the POSTGRES_URL environment variable in your Vercel project settings."
        },
        { status: 500 }
      );
    }
    
    const result = await sql`SELECT NOW() as now;`;
    return NextResponse.json({ ok: true, now: result.rows[0].now }, { status: 200 });
  } catch (error: any) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Database connection failed.",
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}
