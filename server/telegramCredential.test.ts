import { describe, expect, it } from "vitest";

const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
const chatId = process.env.TELEGRAM_CHAT_ID ?? "";

describe("Telegram notification credentials", () => {
  it("accepts the bot token and chat id", async () => {
    expect(token.length).toBeGreaterThan(20);
    expect(chatId).not.toBe("");

    const botResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const botPayload = (await botResponse.json()) as { ok?: boolean; result?: { is_bot?: boolean } };
    expect(botResponse.ok).toBe(true);
    expect(botPayload.ok).toBe(true);
    expect(botPayload.result?.is_bot).toBe(true);

    const chatResponse = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`);
    const chatPayload = (await chatResponse.json()) as { ok?: boolean };
    expect(chatResponse.ok).toBe(true);
    expect(chatPayload.ok).toBe(true);
  }, 15_000);
});
