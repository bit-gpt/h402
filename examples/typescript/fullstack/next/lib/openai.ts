import "server-only";
import { OpenAI } from "openai";

let client: OpenAI | undefined;

export const openai = (): OpenAI => {
  if (client === undefined) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  return client;
};
