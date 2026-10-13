import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import webhookRouter from './src/routes/webhook.routes';
import adminRouter from './src/routes/admin.routes';
import { envConfig } from './src/config';
import { logger } from './src/utils/logger';
import { whatsappService, OutgoingLog } from './src/services/whatsapp.service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = envConfig.port || 3000;

// Preserve raw body for Meta HMAC SHA-256 signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true }));

// Server-Sent Events (SSE) subscribers for live UI simulator and event monitoring
const sseClients: Response[] = [];

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      // client disconnected
    }
  }
}

// Hook WhatsApp service outbound message notifications into SSE
whatsappService.onMessageSent((log: OutgoingLog) => {
  broadcastSSE('whatsapp_outgoing', log);
});

// SSE endpoint for real-time simulator updates
app.get('/api/stream/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');
  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// 1. Health check endpoint (for Render and uptime pinger to avoid cold sleep)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'whatsapp-business-bot'
  });
});

// 2. Webhook endpoint
app.use('/webhook', webhookRouter);

// 3. Admin endpoints
app.use('/api/admin', adminRouter);

// Vite middleware in development or static serve in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    logger.info(`WhatsApp Business Assistant backend running on port ${port}`);
    logger.info(`Webhook GET verification: http://localhost:${port}/webhook`);
    logger.info(`Webhook POST receiver:     http://localhost:${port}/webhook`);
    logger.info(`Health check:               http://localhost:${port}/health`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
