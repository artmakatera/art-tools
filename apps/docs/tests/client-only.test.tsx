import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ClientOnly } from "@/components/client-only";

const content = (
  <ClientOnly fallback={<span>Loading chart</span>}>
    <span>Chart ready</span>
  </ClientOnly>
);

describe("client-only boundary", () => {
  it("renders only fallback content on the server", () => {
    const html = renderToString(content);
    expect(html).toContain("Loading chart");
    expect(html).not.toContain("Chart ready");
  });

  it("hydrates without a mismatch and replaces fallback with children", async () => {
    const host = document.createElement("div");
    host.innerHTML = renderToString(content);
    document.body.append(host);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(host, content, { onRecoverableError });
      });
      expect(host).toHaveTextContent("Chart ready");
      expect(host).not.toHaveTextContent("Loading chart");
      expect(onRecoverableError).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        root?.unmount();
      });
      host.remove();
    }
  });
});
