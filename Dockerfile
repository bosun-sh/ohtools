# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY . .

ENV HUSKY=0

RUN bun install --frozen-lockfile
RUN bun run docs:build

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/apps/docs/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
