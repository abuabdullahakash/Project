import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import webpush from "web-push";
import fs from "fs";

// Configure Web Push
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BLEEEK4tKqed5GMtPiiSSuRAFXu6p8bVkMHrawVSCqAHhIGJDp_024lmBMYXxnPw5LABn6aS60uEZNf3X01sNl0';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'YOvh61mq6pHSj2BKc-toaHIA3XcCBecQR_6UrLtU7ic';

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  publicVapidKey,
  privateVapidKey
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-email", async (req, res) => {
    const serviceId = process.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey) {
      console.error("Missing EmailJS credentials in server environment");
      return res.status(500).json({ error: "EmailJS credentials are not configured in environment variables." });
    }

    try {
      const { to, subject, html } = req.body;
      
      if (!to || !subject || !html) {
        return res.status(400).json({ error: "Missing required fields: to, subject, html" });
      }

      const payload: any = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: to,
          subject: subject,
          message_html: html,
        }
      };

      if (privateKey) {
        payload.accessToken = privateKey;
      }

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        res.json({ success: true });
      } else {
        const errorText = await response.text();
        console.error("EmailJS API Error:", errorText);
        res.status(500).json({ error: "Failed to send email via EmailJS" });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.post("/api/fetch-sheet-csv", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      let fetchUrl = url;
      const sheetIdMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch && sheetIdMatch[1]) {
        fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        return res.status(400).json({ error: "Could not fetch the sheet. Please make sure the Google Sheet is published to the web or set to 'Anyone with the link can view'." });
      }

      const csvText = await response.text();
      
      const lowerText = csvText.trim().toLowerCase();
      if (lowerText.startsWith("<!doctype") || lowerText.startsWith("<html")) {
         return res.status(400).json({ error: "The sheet appears to be private. Please change the share settings to 'Anyone with the link can view'." });
      }

      res.json({ csvText });
    } catch (error: any) {
      console.error("Fetch sheet error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch sheet data." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
