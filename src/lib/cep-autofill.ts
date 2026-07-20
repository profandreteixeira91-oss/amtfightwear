/**
 * Autopreenchimento global de CEP.
 *
 * Escuta qualquer <input> de CEP na página e, ao completar 8 dígitos (ou no
 * blur), consulta o ViaCEP e preenche automaticamente os campos irmãos de
 * endereço/bairro/cidade/UF/complemento — mesmo que sejam inputs
 * controlados pelo React (usa o setter nativo + evento "input" para forçar
 * o sync do estado).
 *
 * Convenções detectadas (case-insensitive) em `name`, `id`,
 * `data-field` ou `placeholder`:
 *  - CEP:         cep | zip | postal
 *  - Endereço:    address | logradouro | rua | endereco | street
 *  - Bairro:      neighborhood | bairro | district
 *  - Cidade:      city | cidade | localidade
 *  - UF:          state | uf | estado (ignora selects/inputs com mais de 2 chars aceitos)
 *  - Complemento: complement | complemento
 *
 * Basta os campos estarem em um ancestral comum (form, fieldset, section
 * ou os 4 primeiros níveis de container).
 */

type ViaCep = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  complemento?: string;
  erro?: boolean;
};

const cache = new Map<string, ViaCep>();
const inFlight = new Set<string>();
const lastFilledFor = new WeakMap<HTMLElement, string>();

function isCepField(el: Element): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) return false;
  if (el.type && !["text", "tel", "search", "number", ""].includes(el.type)) return false;
  const hay = [
    el.name,
    el.id,
    el.getAttribute("data-field") || "",
    el.getAttribute("data-cep") !== null ? "cep" : "",
    el.getAttribute("autocomplete") || "",
    el.placeholder,
    el.getAttribute("aria-label") || "",
  ]
    .join(" ")
    .toLowerCase();
  return /\b(cep|zip|postal[-_ ]?code|postal)\b/.test(hay);
}

function matchField(el: Element, patterns: RegExp): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (
    !(el instanceof HTMLInputElement) &&
    !(el instanceof HTMLSelectElement) &&
    !(el instanceof HTMLTextAreaElement)
  ) {
    return false;
  }
  const hay = [
    (el as HTMLInputElement).name || "",
    el.id || "",
    el.getAttribute("data-field") || "",
    el.getAttribute("autocomplete") || "",
    (el as HTMLInputElement).placeholder || "",
    el.getAttribute("aria-label") || "",
  ]
    .join(" ")
    .toLowerCase();
  return patterns.test(hay);
}

const PATTERNS = {
  address: /\b(address|logradouro|rua|endereco|street|address[-_]?line)\b/,
  neighborhood: /\b(neighborhood|bairro|district)\b/,
  city: /\b(city|cidade|localidade|municipio)\b/,
  state: /\b(state|\buf\b|estado|province)\b/,
  complement: /\b(complement|complemento)\b/,
};

/** Escreve valor em input controlado por React usando o setter nativo. */
function setReactValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  if (!el) return;
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  const nativeSetter = desc?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    (el as HTMLInputElement).value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Procura um campo irmão em ancestrais próximos. */
function findSibling(from: Element, pattern: RegExp): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  let node: Element | null = from.parentElement;
  for (let depth = 0; depth < 6 && node; depth++) {
    const candidates = node.querySelectorAll<HTMLElement>("input, select, textarea");
    for (const c of Array.from(candidates)) {
      if (c === from) continue;
      if (matchField(c, pattern)) return c as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    }
    node = node.parentElement;
  }
  return null;
}

async function fetchCep(cep8: string): Promise<ViaCep | null> {
  if (cache.has(cep8)) return cache.get(cep8) || null;
  if (inFlight.has(cep8)) return null;
  inFlight.add(cep8);
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep8}/json/`);
    if (!r.ok) return null;
    const j = (await r.json()) as ViaCep;
    if (j?.erro) return null;
    cache.set(cep8, j);
    return j;
  } catch {
    return null;
  } finally {
    inFlight.delete(cep8);
  }
}

async function handleCepInput(el: HTMLInputElement) {
  const raw = el.value || "";
  const clean = raw.replace(/\D/g, "");
  if (clean.length !== 8) return;
  if (lastFilledFor.get(el) === clean) return;

  const data = await fetchCep(clean);
  if (!data) return;
  lastFilledFor.set(el, clean);

  const addr = findSibling(el, PATTERNS.address);
  const neigh = findSibling(el, PATTERNS.neighborhood);
  const city = findSibling(el, PATTERNS.city);
  const state = findSibling(el, PATTERNS.state);

  // Só sobrescreve se o campo destino estiver vazio, para não apagar edição
  // manual quando o usuário voltar a mexer no CEP.
  if (addr && !addr.value && data.logradouro) setReactValue(addr, data.logradouro);
  if (neigh && !neigh.value && data.bairro) setReactValue(neigh, data.bairro);
  if (city && !city.value && data.localidade) setReactValue(city, data.localidade);
  if (state && !state.value && data.uf) setReactValue(state, data.uf);
}

let attached = false;

/** Anexa listeners globais no <body>. Idempotente. */
export function attachCepAutofill() {
  if (attached || typeof document === "undefined") return;
  attached = true;

  const onEvent = (e: Event) => {
    const t = e.target as Element | null;
    if (!t || !(t instanceof HTMLInputElement)) return;
    if (!isCepField(t)) return;
    void handleCepInput(t);
  };

  // "input" cobre autofill do navegador e digitação; "blur" cobre colar+sair.
  document.addEventListener("input", onEvent, true);
  document.addEventListener("blur", onEvent, true);
  document.addEventListener("change", onEvent, true);
}
