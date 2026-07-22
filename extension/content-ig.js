// AMT Macro DM — content script no instagram.com
// Executa o fluxo: perfil -> botão Mensagem -> compositor -> envia.

(() => {
  if (window.__amtMacroIg) return;
  window.__amtMacroIg = true;

  const activeJobs = new Set();
  const completedJobs = new Map();

  function reportResult(result, attempt = 0) {
    chrome.runtime.sendMessage(result, () => {
      const failed = !!chrome.runtime.lastError;
      if (failed && attempt < 3) {
        setTimeout(() => reportResult(result, attempt + 1), 700 * (attempt + 1));
      }
    });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "run-dm") {
      const jobId = String(msg.jobId || "legacy-job");
      const completed = completedJobs.get(jobId);
      if (completed) {
        reportResult(completed);
        sendResponse({ ok: true, duplicate: true, completed: true });
        return;
      }
      if (activeJobs.has(jobId)) {
        sendResponse({ ok: true, duplicate: true, running: true });
        return;
      }
      activeJobs.add(jobId);
      runDm(String(msg.message || ""))
        .then(() => {
          const result = { type: "job-result", jobId, ok: true };
          completedJobs.set(jobId, result);
          reportResult(result);
        })
        .catch((err) => {
          const result = {
            type: "job-result",
            jobId,
            ok: false,
            error: String(err?.message || err),
          };
          completedJobs.set(jobId, result);
          reportResult(result);
        })
        .finally(() => activeJobs.delete(jobId));
      sendResponse({ ok: true });
    }
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(fn, { timeout = 20000, interval = 300 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const el = fn();
        if (el) return el;
      } catch {
        /* ignore */
      }
      await sleep(interval);
    }
    throw new Error("Timeout esperando elemento do Instagram");
  }

  function textMatches(node, terms) {
    const t = (node.innerText || node.textContent || "").trim().toLowerCase();
    if (!t || t.length > 60) return false;
    return terms.some((x) => t === x || t.includes(x));
  }

  function findClickable(terms) {
    const nodes = document.querySelectorAll(
      'div[role="button"], button, a[role="button"], a',
    );
    for (const n of nodes) {
      if (textMatches(n, terms)) return n;
      // Aria-label
      const aria = (n.getAttribute("aria-label") || "").toLowerCase();
      if (aria && terms.some((x) => aria.includes(x))) return n;
    }
    return null;
  }

  async function typeIntoComposer(el, text) {
    el.focus();
    // 1) Tentativa via ClipboardEvent (React captura como paste)
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const evt = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(evt);
    } catch {
      /* ignore */
    }

    await sleep(200);
    const current = (el.innerText || el.textContent || "").trim();
    if (current.length >= Math.min(10, text.length)) return;

    // 2) Fallback via execCommand
    try {
      document.execCommand("insertText", false, text);
    } catch {
      /* ignore */
    }

    await sleep(200);
    const after = (el.innerText || el.textContent || "").trim();
    if (after.length >= Math.min(10, text.length)) return;

    // 3) Último fallback: setar textContent + input event
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
  }

  function findFollowButton() {
    // Procura por botão "Seguir"/"Follow" exato — evita "Seguindo"/"Following"/"Solicitado"
    const skip = ["seguindo", "following", "solicitado", "requested", "message", "mensagem"];
    const nodes = document.querySelectorAll('div[role="button"], button');
    for (const n of nodes) {
      const t = (n.innerText || n.textContent || "").trim().toLowerCase();
      if (!t || t.length > 20) continue;
      if (skip.some((s) => t.includes(s))) continue;
      if (t === "seguir" || t === "follow") return n;
    }
    return null;
  }

  async function runDm(message) {
    if (!message) throw new Error("Mensagem vazia");

    // 1) Seguir o perfil (se ainda não segue)
    await sleep(1200);
    const followBtn = findFollowButton();
    if (followBtn) {
      try { followBtn.click(); } catch { /* ignore */ }
      await sleep(1200 + Math.floor(Math.random() * 800));
    }

    // 2) Botão "Mensagem" no perfil (pode ter cooldown de carregamento)
    const msgBtn = await waitFor(
      () =>
        findClickable([
          "message",
          "mensagem",
          "enviar mensagem",
          "send message",
        ]),
      { timeout: 20000 },
    );
    msgBtn.click();

    // 2) Se abrir modal "Ativar notificações", fecha com "Agora não"
    await sleep(1500);
    const notNow = findClickable([
      "not now",
      "agora não",
      "agora nao",
      "cancel",
      "cancelar",
    ]);
    if (notNow) {
      try {
        notNow.click();
      } catch {
        /* ignore */
      }
      await sleep(800);
    }

    // 3) Compositor de mensagem
    const composer = await waitFor(
      () =>
        document.querySelector(
          'div[contenteditable="true"][role="textbox"], textarea[placeholder*="essage" i], textarea[placeholder*="ensagem" i]',
        ),
      { timeout: 25000 },
    );

    await typeIntoComposer(composer, message);
    await sleep(600 + Math.floor(Math.random() * 500));

    // 4) Botão Enviar
    const sendBtn = await waitFor(
      () => {
        // Botões dentro do painel de chat
        const byAria = document.querySelector(
          'div[role="button"][aria-label*="Send" i], div[role="button"][aria-label*="Enviar" i], button[aria-label*="Send" i], button[aria-label*="Enviar" i]',
        );
        if (byAria && !byAria.hasAttribute("disabled")) return byAria;
        return findClickable(["send", "enviar"]);
      },
      { timeout: 10000 },
    );

    sendBtn.click();
    // Aguarda o envio persistir
    await sleep(2000);
  }
})();
