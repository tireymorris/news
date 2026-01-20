import {
  describe,
  expect,
  it,
  spyOn,
  mock,
  beforeEach,
  afterEach,
} from "bun:test";
import sendTelegramMessage from "../src/util/sendTelegramMessage";

describe("sendTelegramMessage", () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChatId = process.env.TELEGRAM_CHAT_ID;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test_token";
    process.env.TELEGRAM_CHAT_ID = "test_chat_id";
  });

  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
    process.env.TELEGRAM_CHAT_ID = originalChatId;
    global.fetch = originalFetch;
  });

  it("should send message successfully", async () => {
    const mockResponse = { ok: true, json: mock(() => Promise.resolve({})) };
    global.fetch = mock(() => Promise.resolve(mockResponse));

    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    await sendTelegramMessage("test message");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest_token/sendMessage",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: "test_chat_id", text: "test message" }),
      }),
    );

    expect(consoleSpy).toHaveBeenCalledWith("Message sent successfully.");

    consoleSpy.mockRestore();
  });

  it("should handle error response", async () => {
    const mockResponse = {
      ok: false,
      statusText: "Bad Request",
      json: mock(() => Promise.resolve({ description: "Invalid token" })),
    };
    global.fetch = mock(() => Promise.resolve(mockResponse));

    const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

    await sendTelegramMessage("test message");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error sending Telegram message:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("should handle fetch error", async () => {
    global.fetch = mock(() => Promise.reject(new Error("Network error")));

    const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

    await sendTelegramMessage("test message");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error sending Telegram message:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
