// AMT Macro DM — service worker
// Recebe pedidos da página do Dojo Manager (via content-bridge)
// e coordena a automação na aba do Instagram (via content-ig).

const JOBS_KEY = "amt-macro-jobs-v1";
const dispatchingTabs = new Set();

async function readJobs() {
  const stored = await chrome.storage.session.get(JOBS_KEY);
  return stored[JOBS_KEY] || {};
}

async function getJob(tabId) {
  const jobs = await readJobs();
  return jobs[String(tabId)] || null;
}

async function saveJob(tabId, job) {
  const jobs = await readJobs();
  jobs[String(tabId)] = job;
  await chrome.storage.session.set({ [JOBS_KEY]: jobs });
}

async function deleteJob(tabId) {
  const jobs = await readJobs();
  delete jobs[String(tabId)];
  await chrome.storage.session.set({ [JOBS_KEY]: jobs });
}

async function notifyPage(job, result) {
  if (job?.senderTabId == null) return;
  await chrome.tabs
    .sendMessage(job.senderTabId, {
      type: "amt-result",
      jobId: job.jobId,
      ok: !!result.ok,
      error: result.error || null,
    })
    .catch(() => {});
}

async function finishJob(tabId, result, closeTab = true) {
  const job = await getJob(tabId);
  if (!job) return;
  await deleteJob(tabId);
  await notifyPage(job, result);
  if (closeTab) {
    setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 2500);
  }
}

async function dispatchJob(tabId, force = false) {
  if (dispatchingTabs.has(tabId)) return;
  const job = await getJob(tabId);
  if (!job || (job.dispatchedAt && !force)) return;

  dispatchingTabs.add(tabId);
  try {
    await saveJob(tabId, { ...job, dispatchedAt: Date.now() });
    const payload = { type: "run-dm", jobId: job.jobId, message: job.message };
    try {
      await chrome.tabs.sendMessage(tabId, payload);
    } catch {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content-ig.js"] });
      await chrome.tabs.sendMessage(tabId, payload);
    }
  } catch (error) {
    await finishJob(tabId, {
      ok: false,
      error: `Não foi possível iniciar o Instagram: ${String(error?.message || error)}`,
    });
  } finally {
    dispatchingTabs.delete(tabId);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "ping") {
    sendResponse({ ok: true, version: "1.0.0" });
    return;
  }

  if (msg.type === "send-dm") {
    const { username, message, jobId } = msg.payload || {};
    if (!username || !message || !jobId) {
      sendResponse({ ok: false, error: "Payload inválido" });
      return;
    }
    void (async () => {
      try {
        const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
        const tab = await chrome.tabs.create({ url, active: true });
        if (tab.id == null) throw new Error("Aba do Instagram não foi criada");
        await saveJob(tab.id, {
          jobId,
          message,
          senderTabId: sender.tab?.id,
          createdAt: Date.now(),
          dispatchedAt: null,
        });
        sendResponse({ ok: true, queued: true });
        if (tab.status === "complete") void dispatchJob(tab.id);
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true; // resposta assíncrona
  }

  if (msg.type === "job-result") {
    const tabId = sender.tab?.id;
    if (tabId == null) return;
    void (async () => {
      const job = await getJob(tabId);
      if (!job || (msg.jobId && msg.jobId !== job.jobId)) return;
      await finishJob(tabId, { ok: !!msg.ok, error: msg.error || null });
    })();
  }
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== "complete") return;
  // Pequeno atraso para o React do IG hidratar
  setTimeout(() => void dispatchJob(tabId), 1500);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const job = await getJob(tabId);
    if (!job) return;
    await deleteJob(tabId);
    await notifyPage(job, {
      ok: false,
      error: "Aba do Instagram fechada antes de finalizar.",
    });
  })();
});

// O Chrome pode suspender o service worker durante o cooldown. Ao reativar,
// recupera os jobs persistidos e retoma abas que já terminaram de carregar.
void (async () => {
  const jobs = await readJobs();
  for (const tabIdValue of Object.keys(jobs)) {
    const tabId = Number(tabIdValue);
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === "complete") void dispatchJob(tabId, true);
    } catch {
      const job = jobs[tabIdValue];
      await deleteJob(tabId);
      await notifyPage(job, {
        ok: false,
        error: "A aba do Instagram não está mais disponível.",
      });
    }
  }
})();
