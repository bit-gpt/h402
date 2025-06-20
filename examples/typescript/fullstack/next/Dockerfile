FROM node:22-alpine3.21 AS base
RUN apk add --no-cache \
        python3 \
        build-base

FROM base AS build

RUN --mount=type=cache,target=/root/.npm \
    npm i -g pnpm@^10.10

WORKDIR /app
COPY ./package.json /app/package.json
COPY ./pnpm-lock.yaml /app/pnpm-lock.yaml
COPY ./pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY ./typescript/packages/h402/package.json /app/typescript/packages/h402/package.json
COPY ./typescript/packages/h402-next/package.json /app/typescript/packages/h402-next/package.json
COPY ./examples/typescript/fullstack/next/package.json /app/examples/typescript/fullstack/next/package.json

RUN --mount=type=cache,target=/app/.pnpm-store \
    pnpm --filter '@bit-gpt/h402' i && \
    pnpm --filter 'h402-next' i && \
    pnpm --filter h402-next-example i

COPY ./typescript/tsconfig.base.json /app/typescript/tsconfig.base.json
COPY ./typescript/packages/h402 /app/typescript/packages/h402
COPY ./typescript/packages/h402-next /app/typescript/packages/h402-next
COPY ./examples/typescript/fullstack/next /app/examples/typescript/fullstack/next

RUN pnpm --filter '@bit-gpt/h402' build
RUN pnpm --filter 'h402-next' build
RUN --mount=type=cache,target=/app/examples/typescript/fullstack/next/.next/cache \
    pnpm --filter h402-next-example build

FROM node:22-alpine3.21 AS prod
COPY --from=build /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/examples/typescript/fullstack/next/.next /app/examples/typescript/fullstack/next/.next
COPY --from=build /app/examples/typescript/fullstack/next/package.json /app/examples/typescript/fullstack/next/package.json
COPY --from=build /app/examples/typescript/fullstack/next/node_modules /app/examples/typescript/fullstack/next/node_modules

RUN npm i -g pnpm@^10.10

WORKDIR /app/examples/typescript/fullstack/next
EXPOSE 3000/tcp
ENTRYPOINT [ "pnpm", "run", "start" ]
