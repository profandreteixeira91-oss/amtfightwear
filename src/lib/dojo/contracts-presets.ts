/**
 * Modelo fixo de contrato de prestação de serviços educacionais e esportivos.
 * Todos os campos são preenchidos automaticamente pelas variáveis do sistema.
 */
export const DEFAULT_CONTRACT_PRESET = {
  name: "Contrato Padrão AMT — Prestação de Serviços",
  description:
    "Modelo completo (LGPD, uso de imagem, cancelamento e foro) com todos os campos preenchidos automaticamente.",
  page_size: "A4" as const,
  page_orientation: "portrait" as const,
  margin_mm: 20,
  show_page_numbers: true,
  header_html: `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #dc2626;padding-bottom:6px;">
  <strong style="font-size:11pt;">{{academia_nome}}</strong>
  <span style="font-size:9pt;color:#64748b;">CNPJ {{academia_cnpj}}</span>
</div>`,
  footer_html: `<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:4px;font-size:9pt;color:#64748b;">
  <span>Contrato nº {{contrato_numero}} — {{academia_nome}}</span>
  <span>Página {{pagina_atual}} de {{total_paginas}}</span>
</div>`,
  content: `<h1 style="text-align:center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS E ESPORTIVOS</h1>

<p><strong>CONTRATANTE:</strong> {{aluno_nome}}, inscrito(a) no CPF nº {{aluno_cpf}}, RG nº {{aluno_rg}}, residente à {{aluno_endereco}}, telefone {{aluno_telefone}}, e-mail {{aluno_email}}.</p>

<p><em>Quando o aluno for menor de 18 anos, este contrato deverá ser assinado pelo responsável legal.</em></p>

<p><strong>RESPONSÁVEL LEGAL:</strong> {{responsavel_nome}}, CPF nº {{responsavel_cpf}}.</p>

<p><strong>CONTRATADA:</strong> {{academia_razao_social}}, pessoa jurídica inscrita no CNPJ nº {{academia_cnpj}}, estabelecida à {{academia_endereco}}, neste ato representada por seu responsável legal {{academia_representante}}.</p>

<p>As partes acima identificadas resolvem celebrar o presente Contrato de Prestação de Serviços Educacionais e Esportivos, mediante as cláusulas e condições abaixo.</p>

<h2>CLÁUSULA 1 – DO OBJETO</h2>
<p>1.1. O presente contrato tem por objeto a prestação de serviços de ensino, treinamento físico, desenvolvimento técnico, atividades esportivas e acompanhamento pedagógico oferecidos pela CONTRATADA, conforme o plano contratado pelo CONTRATANTE.</p>
<p>1.2. Os serviços poderão ser prestados nas dependências da CONTRATADA ou em locais previamente definidos para treinamentos, eventos, seminários ou atividades externas.</p>

<h2>CLÁUSULA 2 – DA MATRÍCULA</h2>
<p>2.1. A matrícula será considerada efetivada após:</p>
<p>a) preenchimento da ficha cadastral;<br/>
b) apresentação da documentação solicitada;<br/>
c) assinatura deste contrato;<br/>
d) pagamento da matrícula, quando houver;<br/>
e) pagamento da primeira mensalidade, quando aplicável.</p>

<h2>CLÁUSULA 3 – DOS SERVIÇOS</h2>
<p>3.1. O plano contratado poderá incluir, conforme a modalidade escolhida:</p>
<ul>
  <li>Aulas presenciais;</li>
  <li>Treinamentos técnicos;</li>
  <li>Atividades físicas;</li>
  <li>Avaliações de desempenho;</li>
  <li>Registro de evolução do aluno;</li>
  <li>Acesso ao aplicativo do aluno;</li>
  <li>Emissão de certificados;</li>
  <li>Participação em eventos internos;</li>
  <li>Conteúdo digital disponibilizado pela CONTRATADA.</li>
</ul>
<p>3.2. Os serviços efetivamente incluídos dependerão do plano contratado.</p>

<h2>CLÁUSULA 4 – DO VALOR</h2>
<p><strong>Plano contratado:</strong> {{contrato_plano}}<br/>
<strong>Valor da mensalidade:</strong> {{contrato_valor}}<br/>
<strong>Vencimento:</strong> dia {{contrato_dia_vencimento}} de cada mês.<br/>
<strong>Forma de pagamento:</strong> {{contrato_forma_pagamento}}</p>

<h2>CLÁUSULA 5 – DO REAJUSTE</h2>
<p>5.1. Os valores poderão ser reajustados anualmente por índice oficial de inflação ou outro permitido pela legislação vigente.</p>
<p>5.2. Havendo alteração significativa na carga tributária ou nos custos operacionais, poderá ocorrer revisão contratual mediante comunicação prévia ao CONTRATANTE.</p>

<h2>CLÁUSULA 6 – DO PAGAMENTO E DA INADIMPLÊNCIA</h2>
<p>6.1. O não pagamento da mensalidade até a data de vencimento acarretará:</p>
<ul>
  <li>Multa de 2%;</li>
  <li>Juros de mora de 1% ao mês;</li>
  <li>Correção monetária.</li>
</ul>
<p>6.2. Permanecendo a inadimplência, a CONTRATADA poderá:</p>
<ul>
  <li>Suspender a participação nas aulas;</li>
  <li>Bloquear o acesso ao aplicativo;</li>
  <li>Impedir inscrições em eventos;</li>
  <li>Encaminhar o débito para cobrança administrativa ou judicial.</li>
</ul>

<h2>CLÁUSULA 7 – DA FREQUÊNCIA</h2>
<p>7.1. O aluno compromete-se a frequentar regularmente as aulas.</p>
<p>7.2. A ausência do aluno não gera direito à restituição de valores.</p>
<p>7.3. A reposição de aulas obedecerá às regras estabelecidas pela CONTRATADA.</p>

<h2>CLÁUSULA 8 – DAS OBRIGAÇÕES DA CONTRATADA</h2>
<ul>
  <li>Disponibilizar professores qualificados;</li>
  <li>Manter ambiente adequado para as atividades;</li>
  <li>Cumprir os horários das aulas;</li>
  <li>Promover ambiente seguro e respeitoso;</li>
  <li>Manter sigilo dos dados pessoais dos alunos;</li>
  <li>Cumprir a legislação vigente.</li>
</ul>

<h2>CLÁUSULA 9 – DAS OBRIGAÇÕES DO ALUNO</h2>
<ul>
  <li>Respeitar professores, colaboradores e demais alunos;</li>
  <li>Cumprir o regulamento interno;</li>
  <li>Utilizar corretamente os equipamentos;</li>
  <li>Informar qualquer condição médica relevante;</li>
  <li>Manter seus dados cadastrais atualizados;</li>
  <li>Utilizar uniforme quando exigido pela CONTRATADA.</li>
</ul>

<h2>CLÁUSULA 10 – DAS CONDIÇÕES DE SAÚDE</h2>
<p>10.1. O CONTRATANTE declara que o aluno possui condições físicas para participar das atividades.</p>
<p>10.2. Havendo restrição médica, deverá apresentar laudo ou autorização específica.</p>
<p>10.3. Qualquer alteração nas condições de saúde deverá ser comunicada imediatamente à CONTRATADA.</p>

<h2>CLÁUSULA 11 – DA RESPONSABILIDADE</h2>
<p>11.1. A CONTRATADA não se responsabiliza por:</p>
<ul>
  <li>Objetos pessoais perdidos, furtados ou esquecidos;</li>
  <li>Acidentes decorrentes do descumprimento das orientações dos professores;</li>
  <li>Informações médicas omitidas pelo aluno;</li>
  <li>Danos causados pelo uso inadequado dos equipamentos.</li>
</ul>

<h2>CLÁUSULA 12 – DO USO DE IMAGEM</h2>
<p>12.1. O CONTRATANTE autoriza, gratuitamente, a utilização da imagem do aluno em fotografias e vídeos produzidos durante aulas, eventos ou atividades promovidas pela CONTRATADA para divulgação institucional.</p>
<p><strong>Manifestação:</strong> {{contrato_autoriza_imagem}}</p>
<p>12.2. Esta autorização poderá ser revogada mediante solicitação escrita.</p>

<h2>CLÁUSULA 13 – DA PROTEÇÃO DE DADOS (LGPD)</h2>
<p>13.1. A CONTRATADA compromete-se a tratar os dados pessoais em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).</p>
<p>13.2. Os dados serão utilizados exclusivamente para:</p>
<ul>
  <li>Cadastro do aluno;</li>
  <li>Comunicação;</li>
  <li>Controle financeiro;</li>
  <li>Emissão de certificados;</li>
  <li>Gestão das atividades;</li>
  <li>Cumprimento de obrigações legais.</li>
</ul>

<h2>CLÁUSULA 14 – DO CANCELAMENTO</h2>
<p>14.1. O presente contrato poderá ser rescindido por qualquer das partes mediante comunicação escrita com antecedência mínima de {{contrato_prazo_aviso_dias}} dias.</p>
<p>14.2. O cancelamento não isenta o pagamento de mensalidades vencidas.</p>
<p>14.3. Havendo cláusula de fidelidade, serão observadas as condições previstas no plano contratado.</p>

<h2>CLÁUSULA 15 – DA SUSPENSÃO</h2>
<p>15.1. O contrato poderá ser suspenso temporariamente, mediante solicitação formal, nas seguintes hipóteses:</p>
<ul>
  <li>Licença médica;</li>
  <li>Mudança temporária de cidade;</li>
  <li>Gestação;</li>
  <li>Outras situações aceitas pela CONTRATADA.</li>
</ul>

<h2>CLÁUSULA 16 – DAS NORMAS INTERNAS</h2>
<p>16.1. O CONTRATANTE declara conhecer e aceitar integralmente o regulamento interno da CONTRATADA.</p>

<h2>CLÁUSULA 17 – DA VIGÊNCIA</h2>
<p>17.1. O presente contrato entra em vigor na data de sua assinatura.</p>
<p><strong>Prazo:</strong> {{contrato_prazo}}<br/>
<strong>Início:</strong> {{contrato_inicio}}<br/>
<strong>Término:</strong> {{contrato_fim}}</p>
<p>17.2. O contrato será renovado automaticamente, salvo manifestação contrária de qualquer das partes.</p>

<h2>CLÁUSULA 18 – DAS DISPOSIÇÕES GERAIS</h2>
<p>18.1. Alterações neste contrato somente terão validade mediante instrumento escrito.</p>
<p>18.2. A eventual tolerância quanto ao descumprimento de qualquer cláusula não implicará renúncia de direitos.</p>
<p>18.3. Caso qualquer cláusula seja considerada inválida, as demais permanecerão em pleno vigor.</p>

<h2>CLÁUSULA 19 – DO FORO</h2>
<p>19.1. Fica eleito o foro da comarca de {{contrato_foro}}, com renúncia a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer controvérsias oriundas deste contrato.</p>

<p>E, por estarem justas e contratadas, firmam o presente instrumento em duas vias de igual teor.</p>

<p><strong>Cidade:</strong> {{academia_cidade}} — <strong>Data:</strong> {{contrato_data}}</p>

<div style="display:flex;justify-content:space-between;gap:24px;margin-top:56px;">
  <div style="text-align:center;width:48%;">
    <div style="border-top:1px solid #000;padding-top:6px;">
      <strong>CONTRATANTE</strong><br/>
      {{aluno_nome}}<br/>
      CPF: {{aluno_cpf}}
    </div>
  </div>
  <div style="text-align:center;width:48%;">
    <div style="border-top:1px solid #000;padding-top:6px;">
      <strong>RESPONSÁVEL LEGAL</strong> (quando aplicável)<br/>
      {{responsavel_nome}}<br/>
      CPF: {{responsavel_cpf}}
    </div>
  </div>
</div>

<div style="display:flex;justify-content:center;margin-top:56px;">
  <div style="text-align:center;width:60%;">
    <div style="border-top:1px solid #000;padding-top:6px;">
      <strong>CONTRATADA</strong><br/>
      Razão Social: {{academia_razao_social}}<br/>
      Representante Legal: {{academia_representante}}<br/>
      Cargo: {{academia_representante_cargo}}
    </div>
  </div>
</div>`,
};
