import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, Network } from "x402-hono";
import { facilitator } from "@coinbase/x402";

config();

const useCdpFacilitator = process.env.USE_CDP_FACILITATOR === "true";
const payTo = process.env.EVM_ADDRESS as `0x${string}`;
const network = process.env.EVM_NETWORK as Network;
const port = parseInt(process.env.PORT || "4021");

if (!payTo || !network) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = new Hono();

// Apply payment middleware to protected endpoint
app.use(
  paymentMiddleware(
    payTo,
    {
      "/protected": {
        price: "$0.001",
        network,
      },
    },
    useCdpFacilitator ? facilitator : undefined,
  ),
);

// Protected endpoint requiring payment
app.get("/protected", c => {
  return c.json({
    message: "Protected endpoint accessed successfully",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", c => {
  return c.json({
    status: "healthy",
  });
});

// Web analytics demo page
app.get("/", c => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hono Server - Web Analytics Demo</title>
      <script type="module">
        import { inject } from 'https://cdn.jsdelivr.net/npm/@vercel/analytics@2.0.1/dist/index.js';
        inject();
      </script>
    </head>
    <body>
      <h1>Hono Server with Vercel Web Analytics</h1>
      <p>This page demonstrates Vercel Web Analytics integration.</p>
      <h2>Available Endpoints:</h2>
      <ul>
        <li><strong>GET /</strong> - This demo page with analytics</li>
        <li><strong>GET /health</strong> - Health check endpoint</li>
        <li><strong>GET /protected</strong> - Protected endpoint requiring payment</li>
        <li><strong>POST /close</strong> - Graceful shutdown</li>
      </ul>
      <p><em>Note: Analytics are tracked when this page is deployed to Vercel.</em></p>
    </body>
    </html>
  `);
});

// Graceful shutdown endpoint
app.post("/close", c => {
  console.log("Received shutdown request");
  setTimeout(() => {
    process.exit(0);
  }, 1000);

  return c.json({
    message: "Shutting down gracefully",
  });
});

console.log("Server listening on port", port);

serve({
  fetch: app.fetch,
  port,
});
