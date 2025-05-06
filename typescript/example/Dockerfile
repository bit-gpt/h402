FROM node:22-alpine3.21 AS base
RUN apk add --no-cache \
        python3 \
        build-base

FROM base AS build

RUN --mount=type=cache,target=/root/.npm \
    npm i -g pnpm@^10.10

WORKDIR /app
COPY ./package.json /app/package.json
COPY ./.npmrc /app/.npmrc
COPY ./pnpm-lock.yaml /app/pnpm-lock.yaml
COPY ./pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY ./typescript/package/package.json /app/typescript/package/package.json
COPY ./typescript/example/package.json /app/typescript/example/package.json 

RUN --mount=type=cache,target=/app/.pnpm-store \
    pnpm --filter '@bit-gpt/h402' i && \
    pnpm --filter example i

COPY ./typescript/package /app/typescript/package
COPY ./typescript/example /app/typescript/example
RUN pnpm --filter '@bit-gpt/h402' build
RUN --mount=type=cache,target=/app/typescript/example/.next/cache \
    pnpm --filter example build
 
FROM node:22-alpine3.21 as prod 
COPY --from=build /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/typescript/example/.next /app/typescript/example/.next
COPY --from=build /app/typescript/example/data /app/typescript/example/data
COPY --from=build /app/typescript/example/package.json /app/typescript/example/package.json
COPY --from=build /app/typescript/example/node_modules /app/typescript/example/node_modules

RUN npm i -g pnpm@^10.10

WORKDIR /app/typescript/example
EXPOSE 3000/tcp
ENTRYPOINT [ "pnpm", "run", "start" ]