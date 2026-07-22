// AMT Macro DM — service worker
// Recebe pedidos da página do Dojo Manager (via content-bridge)
// e coordena a automação na aba do Instagram (via content-ig).

const jobs = new Map(); // igTabId -> { jobId, message, senderTabId }

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "ping") {
    sendResponse({ ok: true, version: "1.0.0" });
    return;
  }

  if (msg.type === "send-dm") {
    const { username, message, jobId } = msg.payload || {};
    if (!username || !message) {
      sendResponse({ ok: false, error: "Payload inválido" });
      return;
    }
    const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
    chrome.tabs.create({ url, active: true }, (tab) => {
      if (tab?.id != null) {
        jobs.set(tab.id, { jobId, message, senderTabId: sender.tab?.id });
      }
      sendResponse({ ok: true, queued: true });
    });
    return true; // resposta assíncrona
  }

  if (msg.type === "job-result") {
    const tabId = sender.tab?.id;
    if (tabId == null) return;
    const job = jobs.get(tabId);
    if (!job) return;
    jobs.delete(tabId);
    if (job.senderTabId != null) {
      chrome.tabs
        .sendMessage(job.senderTabId, {
          type: "amt-result",
          jobId: job.jobId,
          ok: !!msg.ok,
          error: msg.error || null,
        })
        .catch(() => {});
    }
    // Fecha a aba do IG após pequeno delay (dá tempo do IG persistir)
    setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 2500);
  }
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== "complete") return;
  const job = jobs.get(tabId);
  if (!job) return;
  // Pequeno atraso para o React do IG hidratar
  setTimeout(() => {
    chrome.tabs
      .sendMessage(tabId, { type: "run-dm", message: job.message })
      .catch(() => {
        // se o content script ainda não estiver pronto, injeta manualmente
        chrome.scripting
          .executeScript({ target: { tabId }, files: ["content-ig.js"] })
          .then(() =>
            chrome.tabs.sendMessage(tabId, {
              type: "run-dm",
              message: job.message,
            }),
          )
          .catch(() => {});
      });
  }, 1500);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const job = jobs.get(tabId);
  if (!job) return;
  jobs.delete(tabId);
  if (job.senderTabId != null) {
    chrome.tabs
      .sendMessage(job.senderTabId, {
        type: "amt-result",
        jobId: job.jobId,
        ok: false,
        error: "Aba do Instagram fechada antes de finalizar.",
      })
      .catch(() => {});
  }
});
