# Stage 1 — build the React frontend
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2 — application
# Replace YOUR_GITHUB_USERNAME with your actual GitHub username
FROM ghcr.io/Kaapeine/musicanalyzer-base:latest

WORKDIR /app

COPY . .

# Copy the built frontend from stage 1 (excluded from build context via .dockerignore)
COPY --from=frontend-build /frontend/dist ./frontend/dist

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
