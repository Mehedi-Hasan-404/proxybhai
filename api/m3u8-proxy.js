// /api/m3u8-proxy.js
export default async function handler(req, res) {
  const { url, headers } = req.query;

  if (!url) {
    return res.status(400).send("Missing URL parameter");
  }

  // Parse headers JSON if provided
  let customHeaders = {};
  try {
    if (headers) customHeaders = JSON.parse(headers);
  } catch (err) {
    return res.status(400).send("Invalid headers JSON");
  }

  try {
    const response = await fetch(url, {
      headers: { ...customHeaders },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch resource");
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // If the response is a text playlist (M3U8), rewrite segment URLs
    if (contentType.includes("application/vnd.apple.mpegurl") || contentType.includes("vnd.apple.mpegurl") || contentType.includes("text/plain")) {
      const text = await response.text();

      // Rewrite all .ts URLs to go through the proxy
      const rewritten = text.replace(/^(https?:\/\/.*\.ts)$/gm, (match) => {
        const proxiedUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/m3u8-proxy?url=${encodeURIComponent(match)}&headers=${encodeURIComponent(JSON.stringify(customHeaders))}`;
        return proxiedUrl;
      });

      res.send(rewritten);
    } else {
      // For TS segments or other binary data, stream directly
      const reader = response.body.getReader();
      const writer = res;

      // Stream chunks directly to response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writer.write(Buffer.from(value));
      }
      res.end();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error: " + err.message);
  }
}
