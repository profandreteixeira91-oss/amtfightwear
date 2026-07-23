/**
 * Biblioteca de modelos de contrato prontos para a Central de Contratos.
 * Cada preset é auto-suficiente: pode ser instalado como um modelo separado
 * e editado depois no editor. As variáveis {{...}} são resolvidas com os
 * dados da academia / aluno / colaborador / filial no momento da emissão.
 */

const COMMON_HEADER = `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #dc2626;padding-bottom:6px;">
  <strong style="font-size:11pt;">{{academia_nome}}</strong>
  <span style="font-size:9pt;color:#64748b;">CNPJ {{academia_cnpj}}</span>
</div>`;

const COMMON_FOOTER = `<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:4px;font-size:9pt;color:#64748b;">
  <span>Contrato nº {{contrato_numero}} — {{academia_nome}}</span>
  <span>Página {{pagina_atual}} de {{total_paginas}}</span>
</div>`;

const SIGNATURE_TWO = (leftTitle: string, leftName: string, rightTitle = "CONTRATADA", rightName = "{{academia_razao_social}}") => `
<div style="display:flex;justify-content:space-between;gap:24px;margin-top:56px;">
  <div style="text-align:center;width:48%;">
    <div style="border-top:1px solid #000;padding-top:6px;">
      <strong>${leftTitle}</strong><br/>
      ${leftName}
    </div>
  </div>
  <div style="text-align:center;width:48%;">
    <div style="border-top:1px solid #000;padding-top:6px;">
      <strong>${rightTitle}</strong><br/>
      ${rightName}<br/>
      Representante: {{academia_representante}}
    </div>
  </div>
</div>`;

type PresetCategory =
  | "student" | "affiliate" | "teacher" | "employee"
  | "partnership" | "event" | "competition" | "lgpd" | "legal" | "other";

export type ContractPreset = {
  key: string;
  name: string;
  description: string;
  category: PresetCategory;
  page_size: "A4";
  page_orientation: "portrait";
  margin_mm: number;
  show_page_numbers: boolean;
  header_html: string;
  footer_html: string;
  content: string;
};

// -------------------------------------------------------------------------
// 1. Aluno — Padrão
// -------------------------------------------------------------------------
const PRESET_STUDENT: ContractPreset = {
  key: "student-standard",
  name: "Contrato de Aluno — Prestação de Serviços",
  description: "Modelo completo (LGPD, uso de imagem, cancelamento e foro) para matrícula de alunos.",
  category: "student",
  page_size: "A4",
  page_orientation: "portrait",
  margin_mm: 20,
  show_page_numbers: true,
  header_html: COMMON_HEADER,
  footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS E ESPORTIVOS</h1>
<p><strong>CONTRATANTE:</strong> {{aluno_nome}}, CPF {{aluno_cpf}}, RG {{aluno_rg}}, residente à {{aluno_endereco}}, telefone {{aluno_telefone}}, e-mail {{aluno_email}}.</p>
<p><strong>RESPONSÁVEL LEGAL</strong> (quando aplicável): {{responsavel_nome}}, CPF {{responsavel_cpf}}.</p>
<p><strong>CONTRATADA:</strong> {{academia_razao_social}}, CNPJ {{academia_cnpj}}, {{academia_endereco}}, representada por {{academia_representante}}.</p>

<h2>CLÁUSULA 1 – OBJETO</h2>
<p>Prestação de serviços de ensino, treinamento físico e atividades esportivas conforme plano contratado.</p>

<h2>CLÁUSULA 2 – VALOR E PAGAMENTO</h2>
<p><strong>Plano:</strong> {{contrato_plano}} — <strong>Valor:</strong> {{contrato_valor}} — <strong>Vencimento:</strong> dia {{contrato_dia_vencimento}} — <strong>Forma:</strong> {{contrato_forma_pagamento}}.</p>
<p>Atraso: multa de 2%, juros de 1% ao mês e correção monetária. Persistindo a inadimplência, a CONTRATADA poderá suspender aulas e encaminhar a cobrança.</p>

<h2>CLÁUSULA 3 – VIGÊNCIA E CANCELAMENTO</h2>
<p><strong>Início:</strong> {{contrato_inicio}} — <strong>Término:</strong> {{contrato_fim}} — <strong>Prazo:</strong> {{contrato_prazo}}.</p>
<p>Rescisão por qualquer parte mediante aviso prévio de {{contrato_prazo_aviso_dias}} dias, sem prejuízo de mensalidades vencidas.</p>

<h2>CLÁUSULA 4 – FREQUÊNCIA E RESPONSABILIDADE</h2>
<p>Faltas não geram restituição. O CONTRATANTE declara que o aluno possui condições físicas para praticar as atividades e se responsabiliza por informações médicas relevantes.</p>

<h2>CLÁUSULA 5 – USO DE IMAGEM</h2>
<p>Manifestação: {{contrato_autoriza_imagem}}. A autorização pode ser revogada por escrito.</p>

<h2>CLÁUSULA 6 – LGPD</h2>
<p>Os dados serão tratados conforme a Lei 13.709/2018, exclusivamente para cadastro, comunicação, financeiro, certificados e obrigações legais.</p>

<h2>CLÁUSULA 7 – FORO</h2>
<p>Fica eleito o foro de {{contrato_foro}}.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("CONTRATANTE", "{{aluno_nome}}<br/>CPF: {{aluno_cpf}}")}`,
};

// -------------------------------------------------------------------------
// 2. Aluno Menor de Idade
// -------------------------------------------------------------------------
const PRESET_STUDENT_MINOR: ContractPreset = {
  key: "student-minor",
  name: "Contrato de Aluno Menor de Idade",
  description: "Contrato assinado pelo responsável legal, com termo de anuência específico.",
  category: "student",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">CONTRATO DE MATRÍCULA — ALUNO MENOR DE IDADE</h1>
<p><strong>ALUNO(A):</strong> {{aluno_nome}}, nascido(a) em {{aluno_data_nascimento}}, CPF {{aluno_cpf}}.</p>
<p><strong>RESPONSÁVEL LEGAL:</strong> {{responsavel_nome}}, CPF {{responsavel_cpf}}, RG {{responsavel_rg}}, endereço {{responsavel_endereco}}, telefone {{responsavel_telefone}}.</p>
<p><strong>CONTRATADA:</strong> {{academia_razao_social}}, CNPJ {{academia_cnpj}}.</p>

<h2>CLÁUSULA 1 – REPRESENTAÇÃO</h2>
<p>O RESPONSÁVEL LEGAL declara ser detentor da guarda e do poder familiar sobre o(a) aluno(a) e autoriza sua matrícula e participação em todas as atividades ofertadas.</p>

<h2>CLÁUSULA 2 – PLANO E PAGAMENTO</h2>
<p>Plano {{contrato_plano}}, valor {{contrato_valor}}, vencimento dia {{contrato_dia_vencimento}}, forma {{contrato_forma_pagamento}}.</p>

<h2>CLÁUSULA 3 – SAÚDE E EMERGÊNCIA</h2>
<p>O responsável declara que o menor está apto às atividades físicas e autoriza, em caso de emergência, o atendimento médico e o transporte para unidade hospitalar mais próxima.</p>

<h2>CLÁUSULA 4 – ENTRADA E SAÍDA</h2>
<p>O menor poderá sair da unidade acompanhado das pessoas indicadas na ficha cadastral. Sem autorização, permanecerá na academia até a chegada do responsável.</p>

<h2>CLÁUSULA 5 – USO DE IMAGEM</h2>
<p>Manifestação: {{contrato_autoriza_imagem}}. A autorização abrange divulgação institucional em redes sociais e materiais promocionais.</p>

<h2>CLÁUSULA 6 – VIGÊNCIA / CANCELAMENTO</h2>
<p>Início {{contrato_inicio}}, término {{contrato_fim}}. Rescisão mediante aviso de {{contrato_prazo_aviso_dias}} dias.</p>

<h2>CLÁUSULA 7 – FORO</h2>
<p>Foro de {{contrato_foro}}.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("RESPONSÁVEL LEGAL", "{{responsavel_nome}}<br/>CPF: {{responsavel_cpf}}")}`,
};

// -------------------------------------------------------------------------
// 3. Professor / Instrutor Autônomo
// -------------------------------------------------------------------------
const PRESET_TEACHER_AUTONOMO: ContractPreset = {
  key: "teacher-autonomo",
  name: "Contrato de Professor / Instrutor Autônomo",
  description: "Prestação de serviços técnicos de instrutor autônomo (RPA/MEI), com remuneração por aula ou hora.",
  category: "teacher",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS — INSTRUTOR</h1>
<p><strong>CONTRATANTE:</strong> {{academia_razao_social}}, CNPJ {{academia_cnpj}}, {{academia_endereco}}.</p>
<p><strong>CONTRATADO(A):</strong> {{professor_nome}}, CPF {{professor_cpf}}, RG {{professor_rg}}, CREF {{professor_cref}}, endereço {{professor_endereco}}, telefone {{professor_telefone}}.</p>

<h2>CLÁUSULA 1 – OBJETO</h2>
<p>Prestação, em caráter autônomo e sem vínculo empregatício, de serviços de ensino e treinamento na(s) modalidade(s) {{professor_modalidades}}, nos horários definidos em cronograma anexo.</p>

<h2>CLÁUSULA 2 – REMUNERAÇÃO</h2>
<p><strong>Regime:</strong> {{professor_regime}} (aula/hora/mensal).<br/>
<strong>Valor:</strong> {{professor_valor}} — pago até o dia {{professor_dia_pagamento}} do mês subsequente, mediante emissão de RPA/nota fiscal.</p>

<h2>CLÁUSULA 3 – OBRIGAÇÕES DO CONTRATADO</h2>
<ul>
  <li>Cumprir pontualmente os horários das aulas;</li>
  <li>Manter registro ativo no CREF durante toda a vigência;</li>
  <li>Zelar pelo material, equipamentos e alunos;</li>
  <li>Substituição eventual comunicada com 24h de antecedência.</li>
</ul>

<h2>CLÁUSULA 4 – NÃO CONCORRÊNCIA</h2>
<p>Durante a vigência, o CONTRATADO não poderá ministrar aulas particulares aos alunos da CONTRATANTE fora do espaço da academia, salvo autorização escrita.</p>

<h2>CLÁUSULA 5 – VIGÊNCIA E RESCISÃO</h2>
<p>Início {{contrato_inicio}}, prazo {{contrato_prazo}}. Rescisão por qualquer parte mediante aviso de {{contrato_prazo_aviso_dias}} dias.</p>

<h2>CLÁUSULA 6 – NATUREZA DO VÍNCULO</h2>
<p>O presente contrato tem natureza civil, não gerando vínculo empregatício, sendo o CONTRATADO responsável pelos seus tributos e contribuições previdenciárias.</p>

<h2>CLÁUSULA 7 – FORO</h2>
<p>Foro de {{contrato_foro}}.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("CONTRATADO(A)", "{{professor_nome}}<br/>CPF: {{professor_cpf}} — CREF: {{professor_cref}}")}`,
};

// -------------------------------------------------------------------------
// 4. Professor / Colaborador CLT
// -------------------------------------------------------------------------
const PRESET_EMPLOYEE_CLT: ContractPreset = {
  key: "employee-clt",
  name: "Contrato de Trabalho CLT — Colaborador",
  description: "Modelo de contrato de trabalho por prazo indeterminado (CLT) para colaboradores administrativos e técnicos.",
  category: "employee",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">CONTRATO INDIVIDUAL DE TRABALHO — CLT</h1>
<p><strong>EMPREGADOR:</strong> {{academia_razao_social}}, CNPJ {{academia_cnpj}}, {{academia_endereco}}.</p>
<p><strong>EMPREGADO(A):</strong> {{colaborador_nome}}, CPF {{colaborador_cpf}}, RG {{colaborador_rg}}, CTPS {{colaborador_ctps}}, PIS {{colaborador_pis}}, endereço {{colaborador_endereco}}.</p>

<h2>CLÁUSULA 1 – FUNÇÃO</h2>
<p>O EMPREGADO(A) exercerá a função de <strong>{{colaborador_cargo}}</strong>, sujeitando-se ao regulamento interno.</p>

<h2>CLÁUSULA 2 – JORNADA</h2>
<p>Jornada de {{colaborador_jornada}} horas semanais, distribuída de {{colaborador_horario}}, com intervalos legais.</p>

<h2>CLÁUSULA 3 – REMUNERAÇÃO</h2>
<p>Salário mensal de <strong>{{colaborador_salario}}</strong>, pago até o 5º dia útil do mês subsequente, além dos benefícios legais aplicáveis (VT, VR/VA quando cabíveis).</p>

<h2>CLÁUSULA 4 – EXPERIÊNCIA</h2>
<p>Prazo de experiência de {{colaborador_experiencia_dias}} dias, prorrogável uma única vez, convertendo-se em prazo indeterminado após seu término.</p>

<h2>CLÁUSULA 5 – CONFIDENCIALIDADE</h2>
<p>O EMPREGADO(A) compromete-se a manter sigilo sobre informações comerciais, cadastros, base de alunos e materiais didáticos da empresa.</p>

<h2>CLÁUSULA 6 – RESCISÃO</h2>
<p>A rescisão observará as regras da CLT quanto a aviso prévio, verbas rescisórias e homologação.</p>

<h2>CLÁUSULA 7 – FORO</h2>
<p>Fica eleito o foro da Justiça do Trabalho de {{contrato_foro}}.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("EMPREGADO(A)", "{{colaborador_nome}}<br/>CPF: {{colaborador_cpf}}")}`,
};

// -------------------------------------------------------------------------
// 5. Filial / Afiliado
// -------------------------------------------------------------------------
const PRESET_AFFILIATE: ContractPreset = {
  key: "affiliate-franchise",
  name: "Contrato de Filiação / Afiliação",
  description: "Contrato entre a matriz e uma filial/afiliada, incluindo licença de marca, royalties e obrigações operacionais.",
  category: "affiliate",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">CONTRATO DE FILIAÇÃO E LICENÇA DE MARCA</h1>
<p><strong>LICENCIANTE:</strong> {{academia_razao_social}}, CNPJ {{academia_cnpj}}, {{academia_endereco}}.</p>
<p><strong>LICENCIADO(A) / FILIAL:</strong> {{filial_razao_social}}, CNPJ {{filial_cnpj}}, endereço {{filial_endereco}}, representada por {{filial_representante}}, CPF {{filial_representante_cpf}}.</p>

<h2>CLÁUSULA 1 – OBJETO</h2>
<p>Concessão de licença de uso da marca <strong>{{academia_nome}}</strong> e do método pedagógico, para operação da unidade filiada no endereço acima.</p>

<h2>CLÁUSULA 2 – TAXAS</h2>
<p><strong>Taxa de adesão:</strong> {{filial_taxa_adesao}}.<br/>
<strong>Royalty mensal:</strong> {{filial_royalty}} (percentual ou valor fixo), pago até o dia {{filial_dia_pagamento}} de cada mês.<br/>
<strong>Fundo de marketing:</strong> {{filial_fundo_marketing}}.</p>

<h2>CLÁUSULA 3 – PADRÕES OPERACIONAIS</h2>
<p>A FILIAL compromete-se a seguir os padrões visuais, pedagógicos e de atendimento definidos pela LICENCIANTE, incluindo uniformes, comunicação e sistema de gestão.</p>

<h2>CLÁUSULA 4 – EXCLUSIVIDADE TERRITORIAL</h2>
<p>Fica assegurada exclusividade territorial em raio de {{filial_raio_km}} km, respeitados eventuais contratos anteriores.</p>

<h2>CLÁUSULA 5 – VIGÊNCIA E RENOVAÇÃO</h2>
<p>Prazo de {{contrato_prazo}}, com início em {{contrato_inicio}}. Renovação mediante manifestação escrita com {{contrato_prazo_aviso_dias}} dias de antecedência.</p>

<h2>CLÁUSULA 6 – RESCISÃO</h2>
<p>A LICENCIANTE poderá rescindir imediatamente em caso de uso indevido da marca, inadimplência superior a 60 dias ou descumprimento de padrões operacionais.</p>

<h2>CLÁUSULA 7 – NÃO CONCORRÊNCIA</h2>
<p>Durante a vigência e por 12 meses após o término, a FILIAL não poderá operar unidade concorrente similar no território de exclusividade.</p>

<h2>CLÁUSULA 8 – FORO</h2>
<p>Foro de {{contrato_foro}}.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("FILIAL", "{{filial_razao_social}}<br/>Representante: {{filial_representante}}")}`,
};

// -------------------------------------------------------------------------
// 6. Prestador de Serviços (PJ)
// -------------------------------------------------------------------------
const PRESET_SERVICE_PROVIDER: ContractPreset = {
  key: "service-provider-pj",
  name: "Contrato de Prestação de Serviços (PJ)",
  description: "Contratação de pessoa jurídica prestadora (marketing, TI, contabilidade, limpeza, segurança, etc.).",
  category: "partnership",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
<p><strong>CONTRATANTE:</strong> {{academia_razao_social}}, CNPJ {{academia_cnpj}}, {{academia_endereco}}.</p>
<p><strong>CONTRATADA:</strong> {{prestador_razao_social}}, CNPJ {{prestador_cnpj}}, endereço {{prestador_endereco}}, representada por {{prestador_representante}}, CPF {{prestador_representante_cpf}}.</p>

<h2>CLÁUSULA 1 – OBJETO</h2>
<p>Prestação, pela CONTRATADA, dos serviços de <strong>{{prestador_servico}}</strong>, conforme escopo detalhado em anexo.</p>

<h2>CLÁUSULA 2 – VALOR E FORMA DE PAGAMENTO</h2>
<p><strong>Valor:</strong> {{prestador_valor}} — <strong>Periodicidade:</strong> {{prestador_periodicidade}}.<br/>
Pagamento até o dia {{prestador_dia_pagamento}}, mediante emissão de nota fiscal de serviços.</p>

<h2>CLÁUSULA 3 – PRAZO</h2>
<p>Início em {{contrato_inicio}}, com vigência de {{contrato_prazo}}. Renovação automática, salvo denúncia com {{contrato_prazo_aviso_dias}} dias de antecedência.</p>

<h2>CLÁUSULA 4 – OBRIGAÇÕES DA CONTRATADA</h2>
<ul>
  <li>Executar os serviços com zelo e qualidade;</li>
  <li>Manter regularidade fiscal e trabalhista;</li>
  <li>Responder por danos causados por seus prepostos;</li>
  <li>Guardar sigilo sobre informações da CONTRATANTE.</li>
</ul>

<h2>CLÁUSULA 5 – AUSÊNCIA DE VÍNCULO</h2>
<p>O contrato não gera vínculo empregatício entre a CONTRATANTE e os profissionais da CONTRATADA, sendo esta única responsável pelos encargos trabalhistas e previdenciários de sua equipe.</p>

<h2>CLÁUSULA 6 – RESCISÃO</h2>
<p>Qualquer das partes poderá rescindir mediante aviso escrito de {{contrato_prazo_aviso_dias}} dias, sem multa. Rescisão imediata em caso de descumprimento grave.</p>

<h2>CLÁUSULA 7 – FORO</h2>
<p>Foro de {{contrato_foro}}.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("CONTRATADA", "{{prestador_razao_social}}<br/>Representante: {{prestador_representante}}")}`,
};

// -------------------------------------------------------------------------
// 7. Bolsista / Aluno-atleta patrocinado
// -------------------------------------------------------------------------
const PRESET_SCHOLARSHIP: ContractPreset = {
  key: "student-scholarship",
  name: "Termo de Bolsa / Aluno-Atleta Patrocinado",
  description: "Concessão de bolsa (integral ou parcial) mediante contrapartidas de frequência, competição e representação.",
  category: "student",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">TERMO DE CONCESSÃO DE BOLSA DE ESTUDOS ESPORTIVA</h1>
<p><strong>CONCEDENTE:</strong> {{academia_razao_social}}, CNPJ {{academia_cnpj}}.</p>
<p><strong>BOLSISTA:</strong> {{aluno_nome}}, CPF {{aluno_cpf}}, RG {{aluno_rg}}, representado(a) por {{responsavel_nome}} (quando menor).</p>

<h2>CLÁUSULA 1 – OBJETO DA BOLSA</h2>
<p>Concessão de bolsa <strong>{{bolsa_tipo}}</strong> (integral / parcial de {{bolsa_percentual}}%) sobre a mensalidade do plano {{contrato_plano}}, no valor original de {{contrato_valor}}.</p>

<h2>CLÁUSULA 2 – VIGÊNCIA</h2>
<p>Início em {{contrato_inicio}} e término em {{contrato_fim}}, podendo ser renovada mediante nova avaliação.</p>

<h2>CLÁUSULA 3 – CONTRAPARTIDAS DO BOLSISTA</h2>
<ul>
  <li>Frequência mínima de {{bolsa_frequencia_min}}% nas aulas;</li>
  <li>Participação nas competições indicadas pela CONCEDENTE;</li>
  <li>Uso obrigatório do uniforme e patches oficiais em eventos;</li>
  <li>Representar a academia com postura e disciplina;</li>
  <li>Autorização de uso de imagem em campanhas institucionais.</li>
</ul>

<h2>CLÁUSULA 4 – SUSPENSÃO E CANCELAMENTO</h2>
<p>A bolsa poderá ser suspensa ou cancelada em caso de: (i) frequência inferior à mínima; (ii) conduta incompatível; (iii) representação de outra academia sem autorização; (iv) desligamento voluntário.</p>

<h2>CLÁUSULA 5 – REVERSÃO EM CASO DE DESLIGAMENTO ANTECIPADO</h2>
<p>Havendo desligamento antes do término da bolsa sem justa causa, o BOLSISTA poderá ser responsabilizado pelos valores subsidiados, proporcionalmente ao período usufruído.</p>

<h2>CLÁUSULA 6 – FORO</h2>
<p>Foro de {{contrato_foro}}.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("BOLSISTA / RESPONSÁVEL", "{{aluno_nome}} — CPF: {{aluno_cpf}}<br/>Responsável: {{responsavel_nome}}")}`,
};

// -------------------------------------------------------------------------
// 8. Estagiário / Aprendiz Técnico
// -------------------------------------------------------------------------
const PRESET_INTERN: ContractPreset = {
  key: "intern-agreement",
  name: "Termo de Estágio / Formação de Instrutor",
  description: "Programa de formação técnica supervisionada (auxiliar de professor, faixa-preta em formação, etc.).",
  category: "employee",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">TERMO DE ESTÁGIO E FORMAÇÃO TÉCNICA</h1>
<p><strong>UNIDADE CONCEDENTE:</strong> {{academia_razao_social}}, CNPJ {{academia_cnpj}}.</p>
<p><strong>ESTAGIÁRIO(A):</strong> {{estagiario_nome}}, CPF {{estagiario_cpf}}, RG {{estagiario_rg}}, curso/graduação {{estagiario_curso}}, instituição {{estagiario_instituicao}}.</p>

<h2>CLÁUSULA 1 – OBJETO</h2>
<p>Realização de estágio prático supervisionado nas atividades de {{estagiario_area}}, sob orientação do professor responsável {{estagiario_supervisor}}.</p>

<h2>CLÁUSULA 2 – JORNADA</h2>
<p>Carga horária de {{estagiario_carga}} horas semanais, respeitando os limites legais e sem prejuízo das atividades acadêmicas.</p>

<h2>CLÁUSULA 3 – BOLSA-AUXÍLIO</h2>
<p>Bolsa-auxílio mensal de {{estagiario_bolsa}}, quando aplicável, paga até o dia {{estagiario_dia_pagamento}}.</p>

<h2>CLÁUSULA 4 – NATUREZA</h2>
<p>O estágio não caracteriza vínculo empregatício, conforme Lei 11.788/2008.</p>

<h2>CLÁUSULA 5 – VIGÊNCIA</h2>
<p>De {{contrato_inicio}} a {{contrato_fim}}, prorrogável mediante termo aditivo.</p>

<h2>CLÁUSULA 6 – RESCISÃO</h2>
<p>Rescisão antecipada mediante comunicação escrita de {{contrato_prazo_aviso_dias}} dias.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("ESTAGIÁRIO(A)", "{{estagiario_nome}}<br/>CPF: {{estagiario_cpf}}")}`,
};

// -------------------------------------------------------------------------
// 9. Termo de Uso de Imagem / LGPD
// -------------------------------------------------------------------------
const PRESET_IMAGE_LGPD: ContractPreset = {
  key: "image-lgpd",
  name: "Autorização de Uso de Imagem e Consentimento LGPD",
  description: "Termo autônomo para uso de imagem, voz e dados em campanhas e conteúdos institucionais.",
  category: "lgpd",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E CONSENTIMENTO LGPD</h1>
<p><strong>TITULAR:</strong> {{aluno_nome}}, CPF {{aluno_cpf}}. <strong>Responsável (se menor):</strong> {{responsavel_nome}}, CPF {{responsavel_cpf}}.</p>

<h2>1. OBJETO</h2>
<p>O TITULAR autoriza a {{academia_razao_social}}, CNPJ {{academia_cnpj}}, a captar, armazenar e divulgar imagens, vídeos e áudios produzidos em aulas, eventos e campanhas.</p>

<h2>2. FINALIDADES</h2>
<ul>
  <li>Divulgação institucional em redes sociais, site e materiais impressos;</li>
  <li>Campanhas de matrícula e retenção;</li>
  <li>Documentação pedagógica interna;</li>
  <li>Envio de comunicações relacionadas às atividades da academia.</li>
</ul>

<h2>3. BASES LEGAIS (LGPD, art. 7º)</h2>
<p>Consentimento livre e informado do TITULAR / responsável legal, e execução de contrato do qual é parte.</p>

<h2>4. PRAZO E REVOGAÇÃO</h2>
<p>Autorização por prazo indeterminado, podendo ser revogada a qualquer tempo por solicitação escrita ao encarregado de dados {{academia_dpo}} — e-mail {{academia_dpo_email}}.</p>

<h2>5. DIREITOS DO TITULAR</h2>
<p>Confirmação de tratamento, acesso, correção, anonimização, portabilidade e eliminação, nos termos da Lei 13.709/2018.</p>

<p><strong>Manifestação:</strong> {{contrato_autoriza_imagem}}</p>
<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("TITULAR / RESPONSÁVEL", "{{aluno_nome}} — CPF: {{aluno_cpf}}<br/>Responsável: {{responsavel_nome}}")}`,
};

// -------------------------------------------------------------------------
// 10. Termo de Responsabilidade / Isenção
// -------------------------------------------------------------------------
const PRESET_LIABILITY: ContractPreset = {
  key: "liability-waiver",
  name: "Termo de Responsabilidade e Ciência de Risco",
  description: "Ciência dos riscos inerentes à prática de artes marciais e esportes de contato.",
  category: "legal",
  page_size: "A4", page_orientation: "portrait", margin_mm: 20, show_page_numbers: true,
  header_html: COMMON_HEADER, footer_html: COMMON_FOOTER,
  content: `<h1 style="text-align:center;">TERMO DE RESPONSABILIDADE E CIÊNCIA DE RISCO</h1>
<p><strong>PRATICANTE:</strong> {{aluno_nome}}, CPF {{aluno_cpf}}, RG {{aluno_rg}}.<br/>
<strong>Responsável (se menor):</strong> {{responsavel_nome}}, CPF {{responsavel_cpf}}.</p>

<h2>1. NATUREZA DA ATIVIDADE</h2>
<p>O PRATICANTE declara ter ciência de que as atividades ofertadas pela {{academia_razao_social}} envolvem esforço físico, contato corporal, uso de técnicas de projeção, imobilização e/ou golpes, com risco inerente de lesões.</p>

<h2>2. CONDIÇÕES DE SAÚDE</h2>
<p>Declara estar apto às atividades e não possuir doenças que impeçam a prática. Compromete-se a comunicar imediatamente qualquer alteração em seu estado de saúde.</p>

<h2>3. CONDUTA</h2>
<p>Compromete-se a seguir as orientações dos professores, utilizar equipamentos de proteção quando indicados e respeitar colegas e instrutores.</p>

<h2>4. ISENÇÃO PARCIAL</h2>
<p>A academia não se responsabiliza por lesões decorrentes de descumprimento das orientações técnicas, uso inadequado de equipamentos, omissão de informações médicas ou treinamento fora do ambiente supervisionado.</p>

<h2>5. USO DE IMAGEM</h2>
<p>Manifestação: {{contrato_autoriza_imagem}}.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>
${SIGNATURE_TWO("PRATICANTE / RESPONSÁVEL", "{{aluno_nome}} — CPF: {{aluno_cpf}}<br/>Responsável: {{responsavel_nome}}")}`,
};

export const CONTRACT_PRESETS: ContractPreset[] = [
  PRESET_STUDENT,
  PRESET_STUDENT_MINOR,
  PRESET_SCHOLARSHIP,
  PRESET_TEACHER_AUTONOMO,
  PRESET_EMPLOYEE_CLT,
  PRESET_INTERN,
  PRESET_AFFILIATE,
  PRESET_SERVICE_PROVIDER,
  PRESET_IMAGE_LGPD,
  PRESET_LIABILITY,
];

/**
 * Preset padrão — mantido para compatibilidade com o botão "Modelo padrão"
 * já existente na biblioteca.
 */
export const DEFAULT_CONTRACT_PRESET = {
  name: PRESET_STUDENT.name,
  description: PRESET_STUDENT.description,
  page_size: PRESET_STUDENT.page_size,
  page_orientation: PRESET_STUDENT.page_orientation,
  margin_mm: PRESET_STUDENT.margin_mm,
  show_page_numbers: PRESET_STUDENT.show_page_numbers,
  header_html: PRESET_STUDENT.header_html,
  footer_html: PRESET_STUDENT.footer_html,
  content: PRESET_STUDENT.content,
  category: PRESET_STUDENT.category,
};
