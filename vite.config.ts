
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import http from 'http';

const apiPlugin = () => ({
  name: 'vite-plugin-api-routes',
  configureServer(server: any) {
    server.middlewares.use(async (req: Connect.IncomingMessage, res: http.ServerResponse, next: Connect.NextFunction) => {
      if (req.url && req.url.startsWith('/api/')) {
        try {
          const moduleUrl = `.${req.url}.ts`;
          const { default: handler } = await import(moduleUrl);
          
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req as any : null,
            // @ts-ignore
            duplex: 'half',
          });
          
          const response = await handler(request);

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
            res.end('Internal Server Error');
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
