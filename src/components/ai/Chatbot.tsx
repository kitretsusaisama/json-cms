'use client';

import { useState } from "react";
import {logger} from "@/lib/logger";
export default function Chatbot(): JSX.Element {
  const [message, setMessage] = useState<string>("");
  const [reply, setReply] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const send = async (): Promise<void> => {
    if (!message.trim()) {
      return; // prevent sending empty messages
    }

    setLoading(true);
    setReply("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.body) {
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          setReply((prev) => prev + decoder.decode(value));
        }
      }
    } catch (err) {
      logger.error({
        message: "Chatbot failed to process message",
        error: err instanceof Error ? err : new Error(String(err)),
        component: "Chatbot",
        userMessage: message,
      });
      setReply("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }  };

  return (
    <div className="space-y-2 border rounded p-3">
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border px-2 py-1"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask something..."
        />
        <button
          onClick={send}
          disabled={loading || !message.trim()}
          className="px-3 py-1 bg-black text-white disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm opacity-90">{reply}</pre>
    </div>
  );
}
