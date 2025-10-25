// /api/m3u8-proxy.js
export default async function handler(req, res) {
  const { url, headers } = req.query;

  if (!url) {
    return res.status(400).send("Missing URL parameter");
  }

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

    // Pass through response type (m3u8 or TS chunks)
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/vnd.apple.mpegurl");

    // Pipe response
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error: " + err.message);
  }
}
