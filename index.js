const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

const GPU_BACKEND = process.env.GPU_BACKEND || "https://mostly-giants-retained-completing.trycloudflare.com";

app.get("/health", (req, res) => res.json({ status: "healthy", service: "video-forensics-v2" }));
app.get("/version", (req, res) => res.json({ version: "2.1.0", backend: GPU_BACKEND }));

// Proxy all POST endpoints to GPU backend
const proxyPost = (path, timeout) => {
  app.post(path, async (req, res) => {
    try {
      const r = await axios.post(GPU_BACKEND + path, req.body, {
        timeout, maxContentLength: 100*1024*1024,
        headers: {"Content-Type": "application/json"},
        transformResponse: [data => data]
      });
      const ct = r.headers["content-type"] || "application/json";
      res.set("Content-Type", ct).status(r.status).send(r.data);
    } catch (e) {
      const status = e.response?.status || 502;
      const detail = e.response?.data || "GPU backend unreachable";
      res.status(status).json({ error: e.message, detail });
    }
  });
};

proxyPost("/extract-frames", 300000);
proxyPost("/analyze-batch", 600000);
proxyPost("/generate-report", 600000);
proxyPost("/forensics-report/start", 30000);
proxyPost("/forensics-report/update", 30000);
proxyPost("/forensics-report/generate", 600000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Video Forensics V2 proxy on port " + PORT));
