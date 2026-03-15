"use server";
import { aiProvider } from "./provider";

export async function askAI(prompt: string): Promise<string> {
  return aiProvider.complete({ prompt });
}
