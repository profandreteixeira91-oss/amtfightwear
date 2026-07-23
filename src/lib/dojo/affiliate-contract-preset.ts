// Contrato de Filiação — modelo base fixo com 8 cláusulas.
// Variáveis são resolvidas pelo editor de contratos.
export const AFFILIATE_CONTRACT_PRESET_HTML = `
<h1 style="text-align:center">CONTRATO DE FILIAÇÃO ESPORTIVA</h1>
<p style="text-align:center"><em>Entre {{organization_name}} e {{affiliate_name}}</em></p>

<p>Pelo presente instrumento particular, de um lado <strong>{{organization_name}}</strong>,
inscrita no CNPJ sob nº {{organization_cnpj}}, doravante denominada <strong>ORGANIZAÇÃO</strong>,
e de outro lado a academia <strong>{{affiliate_name}}</strong>, CNPJ {{cnpj}}, com sede em
{{address}}, {{city}}/{{state}}, neste ato representada por seu responsável
{{manager_name}}, CPF {{cpf}}, doravante denominada <strong>FILIADA</strong>,
resolvem celebrar o presente contrato, mediante as cláusulas e condições a seguir:</p>

<h2>Cláusula 1ª — Do Objeto</h2>
<p>Constitui objeto deste contrato a filiação da FILIADA à ORGANIZAÇÃO, sob o número de
filiação <strong>{{affiliation_number}}</strong>, com todos os direitos e deveres decorrentes
do vínculo institucional.</p>

<h2>Cláusula 2ª — Dos Direitos da Filiada</h2>
<p>A FILIADA terá direito a: (i) uso do nome, logotipo e identidade visual da ORGANIZAÇÃO
conforme diretrizes oficiais; (ii) participação em eventos, competições e graduações
promovidos pela ORGANIZAÇÃO; (iii) emissão de certificados e graduações reconhecidas;
(iv) suporte técnico e pedagógico oferecido pela ORGANIZAÇÃO.</p>

<h2>Cláusula 3ª — Das Obrigações da Filiada</h2>
<p>A FILIADA compromete-se a: (i) manter em dia as contribuições financeiras pactuadas;
(ii) zelar pela imagem da ORGANIZAÇÃO; (iii) seguir as diretrizes técnicas, éticas e
disciplinares estabelecidas; (iv) prestar informações periódicas de alunos, graduações
e eventos, quando solicitadas; (v) não utilizar a marca da ORGANIZAÇÃO para fins
alheios ao esporte sem autorização expressa.</p>

<h2>Cláusula 4ª — Das Obrigações da Organização</h2>
<p>A ORGANIZAÇÃO compromete-se a: (i) manter a FILIADA regularmente cadastrada;
(ii) fornecer canais de comunicação e suporte; (iii) reconhecer as graduações emitidas
conforme padrão técnico definido; (iv) tratar a FILIADA de forma isonômica em relação
às demais filiadas.</p>

<h2>Cláusula 5ª — Dos Pagamentos</h2>
<p>A FILIADA pagará à ORGANIZAÇÃO os valores de contribuição estabelecidos em documento
apartado, sendo o pagamento realizado por meio dos canais oficiais da ORGANIZAÇÃO.
O atraso superior a 60 (sessenta) dias autoriza a suspensão da filiação.</p>

<h2>Cláusula 6ª — Da Vigência</h2>
<p>O presente contrato entra em vigor na data de sua assinatura, em {{signed_at}},
com prazo indeterminado, podendo ser rescindido por qualquer das partes mediante
comunicação escrita com antecedência mínima de 30 (trinta) dias.</p>

<h2>Cláusula 7ª — Da Rescisão</h2>
<p>Constituem causas de rescisão imediata: (i) descumprimento das obrigações previstas;
(ii) uso indevido da marca ou imagem da ORGANIZAÇÃO; (iii) conduta antidesportiva
ou antiética por parte da FILIADA ou de seus representantes; (iv) inadimplência
superior a 90 (noventa) dias.</p>

<h2>Cláusula 8ª — Do Foro</h2>
<p>Fica eleito o foro da comarca da sede da ORGANIZAÇÃO para dirimir quaisquer
questões oriundas do presente contrato, com renúncia expressa a qualquer outro,
por mais privilegiado que seja.</p>

<p style="margin-top:2rem">E, por estarem assim justos e contratados, firmam o presente
instrumento em duas vias de igual teor.</p>

<p style="margin-top:2rem">_______________________________<br/>{{organization_name}} — ORGANIZAÇÃO</p>
<p style="margin-top:2rem">_______________________________<br/>{{affiliate_name}} — FILIADA</p>
`;

export function buildAffiliateContractVariables(params: {
  organization_name?: string | null;
  organization_cnpj?: string | null;
  affiliate: any;
}): Record<string, string> {
  const a = params.affiliate ?? {};
  const addr = [a.street, a.number, a.neighborhood].filter(Boolean).join(", ") || "";
  return {
    organization_name: params.organization_name ?? "",
    organization_cnpj: params.organization_cnpj ?? "",
    affiliate_name: a.trade_name || a.legal_name || a.academy_name || "",
    academy_name: a.academy_name || "",
    cnpj: a.cnpj ?? "",
    address: addr,
    city: a.city ?? "",
    state: a.state ?? "",
    manager_name: a.manager_name ?? "",
    cpf: a.manager_cpf ?? "",
    affiliation_number: a.affiliation_number ?? "",
    signed_at: new Date().toLocaleDateString("pt-BR"),
  };
}

export function renderAffiliateContract(
  html: string,
  vars: Record<string, string>,
): string {
  return html.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi, (_m, key) => {
    const v = vars[key];
    return v == null || v === "" ? `<span style="color:#999">[${key}]</span>` : v;
  });
}
