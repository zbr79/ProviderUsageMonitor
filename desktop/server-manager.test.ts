import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { classifyProbe } = require("./server-manager.js") as {
  classifyProbe: (ok: boolean, html: string) => "ours" | "other" | "down";
};

describe("classifyProbe", () => {
  it("treats this app's widget page as ours", () => {
    expect(classifyProbe(true, "<title>Provider Usage Monitor</title>")).toBe("ours");
  });

  it("treats another program on the port as other", () => {
    expect(classifyProbe(true, "<title>Something Else</title>")).toBe("other");
  });

  it("treats a failed response as down", () => {
    expect(classifyProbe(false, "Provider Usage Monitor")).toBe("down");
  });
});
