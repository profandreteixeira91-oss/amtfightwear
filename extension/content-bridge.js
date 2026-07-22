// AMT Macro DM — ponte entre a página do Dojo Manager e o service worker.
// A página posta mensagens via window.postMessage; nós repassamos para a extensão.

(() => {
  if (window.__amtMacroBridge) return;
  window.__amtMacroBridge = true;

  const EXT_VERSION = "1.0.0";

  // Anúncio de presença — a página escuta este evento para habilitar o modo auto.
  const announce = () => {
    window.postMessage(
      { source: "amt-macro-ext", type: "ready", version: EXT_VERSION },
      "*",
    );
  };
  announce();
  // Reannouncia se a página perguntar
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.source === "amt-macro-page" && data.type === "who") {
      announce();
    }
  });

  // Encaminha pedidos da página -> service worker
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "amt-macro-page") return;
    if (!data.payload) return;
    try {
      chrome.runtime.sendMessage(data.payload, (response) => {
        // Ignora erros de "no receiver" — a página só precisa do evento assíncrono depois
        void chrome.runtime.lastError;
        window.postMessage(
          {
            source: "amt-macro-ext",
            type: "response",
            reqId: data.reqId,
            response,
          },
          "*",
        );
      });
    } catch (err) {
      window.postMessage(
        {
          source: "amt-macro-ext",
          type: "response",
          reqId: data.reqId,
          response: { ok: false, error: String(err?.message || err) },
        },
        "*",
      );
    }
  });

  // Resultado assíncrono vindo do service worker -> repassa para a página
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== "amt-result") return;
    window.postMessage(
      {
        source: "amt-macro-ext",
        type: "result",
        jobId: msg.jobId,
        ok: !!msg.ok,
        error: msg.error || null,
      },
      "*",
    );
  });
})();
