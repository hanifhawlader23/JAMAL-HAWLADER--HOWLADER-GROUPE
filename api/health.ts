import { sql } from '@vercel/postgres';

export const runtime = 'edge'; // This can run on the edge as it's a simple query

const jsonResponse = (data: any, status: number = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

export default async function GET(request: Request) {
  try {
    // Explicitly check for the database connection URL to provide a better error message.
    if (!process.env.POSTGRES_URL) {
      return jsonResponse(
        { 
          ok: false, 
          error: "Database connection string is not configured.",
          message: "Please set the POSTGRES_URL environment variable in your Vercel project settings."
        },
        500
      );
    }
    
    const result = await sql`SELECT NOW() as now;`;
    return jsonResponse({ ok: true, now: result.rows[0].now }, 200);
  } catch (error: any) {
    console.error("Health check failed:", error);
    return jsonResponse(
      { 
        ok: false, 
        error: "Database connection failed.",
        message: error.message 
      }, 
      500
    );
  }
}