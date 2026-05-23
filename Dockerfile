# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached until package files change)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source
COPY . .

# Vite bakes VITE_* env vars into the bundle at build time.
# Pass them as --build-arg; the anon key is a public client key (safe to bake in).
# Email is handled server-side via the Supabase Edge Function — no email keys here.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA (static/ publicDir contents are merged into dist/ by Vite)
COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run routes traffic to port 8080 by default
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
