import { NextRequest } from "next/server.js";

export const getHost = (request: NextRequest) => {
    return (request.headers.get('x-forwarded-host') || request.headers.get('host'))!
}

export const getScheme = (request: NextRequest) => {
    return (request.headers.get('x-scheme') === 'https' || request.nextUrl.port === '443') ? 'https' : 'http'
}

export const getUrl = (request: NextRequest) => {
    return `${getScheme(request)}://${getHost(request)}`
}

export const getFacilitator = () => process.env.FACILITATOR_URL || "https://facilitator.bitgpt.xyz"
