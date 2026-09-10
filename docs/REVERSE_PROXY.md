# 🌐 Reverse Proxy Recipes for TuneFlow

TuneFlow is **100% reverse-proxy agnostic**. Choose your preferred setup below.

---

## 1. Traefik v3 (Docker Labels)

Attach these labels to the `tuneflow` service in your `compose.yaml`:

```yaml
services:
  tuneflow:
    image: ghcr.io/tamld/tuneflow:latest
    container_name: tuneflow
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tuneflow.rule=Host(`tuneflow.local`)"
      - "traefik.http.routers.tuneflow.entrypoints=websecure"
      - "traefik.http.routers.tuneflow.tls=true"
      - "traefik.http.services.tuneflow.loadbalancer.server.port=3000"
```

---

## 2. Nginx / Nginx Proxy Manager

Ensure `proxy_buffering` is disabled to support real-time audio byte-range streaming:

```nginx
server {
    listen 80;
    server_name tuneflow.local;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical for instant audio streaming and seeking:
        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

---

## 3. Caddy 2

Add this block to your `Caddyfile`:

```caddy
tuneflow.local {
    reverse_proxy localhost:3000
}
```

---

## 4. Cloudflare Tunnel (Zero Trust)

1. Open your Cloudflare Zero Trust Dashboard.
2. Navigate to **Networks** -> **Tunnels** -> **Add a Public Hostname**.
3. Point your public domain (e.g. `music.example.com`) to `http://localhost:3000`.
4. No router port forwarding required.
