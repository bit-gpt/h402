import { NextRequest } from "next/server";

export const getHost = (request: NextRequest) => {
    return (request.headers.get('x-forwarded-host') || request.headers.get('host'))!
}
