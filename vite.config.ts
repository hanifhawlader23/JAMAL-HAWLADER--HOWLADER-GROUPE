
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import http from 'http';

// Helper to read body from request
async function readBody(req: Connect.IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const body: Buffer[] = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => resolve(Buffer.concat(body)));
        req.on('error', err => reject(err));
    });
}

const apiPlugin = () => ({
  name: 'vite-plugin-api-routes',
  configureServer(server: any) {
    server.middlewares.use(async (req: Connect.IncomingMessage, res: http.ServerResponse, next: Connect.NextFunction) => {
      if (req.url && req.url.startsWith('/api/')) {
        try {
          // Construct the path to the API handler module
          const modulePath = `.${req.url.split('?')[0]}.ts`;
          
          // Dynamically import the handler
          const { default: handler } = await import(modulePath);
          
          // Reconstruct the request for the handler
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers as HeadersInit,
            // Only add body for relevant methods
            body: req.method !== 'GET' && req.method !== 'HEAD' ? await readBody(req) : null,
            // @ts-ignore
            duplex: 'half',
          });
          
          // Call the handler and get the response
          const response = await handler(request);

          // Pipe the response back to the client
          res.statusCode = response.status;
          for (const [key, value] of response.headers.entries()) {
            res.setHeader(key, value);
          }
          
          if (response.body) {
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
          return;
        } catch (error) {
          console.error(`API handler error for ${req.url}:`, error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error. Check Vite console for details.');
          }
          return;
        }
      }
      next();
    });
  },
});


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
});
