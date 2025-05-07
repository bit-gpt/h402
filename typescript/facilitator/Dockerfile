FROM node:22-alpine3.21 AS base
RUN apk add --no-cache \
    python3 \
    build-base \
    sqlite-dev

FROM base AS build

RUN --mount=type=cache,target=/root/.npm \
    npm i -g pnpm@^10.10

WORKDIR /app
COPY ./package.json /app/package.json
COPY ./.npmrc /app/.npmrc
COPY ./pnpm-lock.yaml /app/pnpm-lock.yaml
COPY ./pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY ./typescript/package/package.json /app/typescript/package/package.json
COPY ./typescript/facilitator/package.json /app/typescript/facilitator/package.json 

RUN --mount=type=cache,target=/app/.pnpm-store \
    pnpm --filter '@bit-gpt/h402' i && \
    pnpm --filter facilitator i

COPY ./typescript/package /app/typescript/package
COPY ./typescript/facilitator /app/typescript/facilitator
RUN pnpm --filter '@bit-gpt/h402' build && \
    pnpm --filter facilitator build
 
FROM node:22-alpine3.21 AS prod 
RUN apk add --no-cache python3 build-base sqlite-dev && \
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup

WORKDIR /app

# Copy production files
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build /app/typescript/package/package.json /app/typescript/package/package.json
COPY --from=build /app/typescript/facilitator/package.json /app/typescript/facilitator/package.json
COPY --from=build /app/typescript/package/dist /app/typescript/package/dist
COPY --from=build /app/typescript/facilitator/dist /app/typescript/facilitator/dist

# Install production dependencies
RUN npm i -g pnpm@^10.10 && \
    pnpm --filter '@bit-gpt/h402' i --prod --frozen-lockfile --ignore-scripts && \
    pnpm --filter facilitator i --prod --frozen-lockfile --ignore-scripts && \
    cd /app/typescript/facilitator/node_modules/better-sqlite3 && \
    npm run install --build-from-source && \
    mkdir -p /data && \
    chown -R appuser:appgroup /data /app && \
    chmod -R 755 /data && \
    npm cache clean --force && \
    rm -rf /tmp/*

WORKDIR /app/typescript/facilitator

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --spider http://localhost:${PORT:-3000}/health || exit 1

ENTRYPOINT ["node", "dist/index.js"]