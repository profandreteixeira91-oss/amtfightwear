import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  leadName?: string
  greetingName?: string
  customMessage?: string
  imageUrl?: string
}

const DEFAULT_IMAGE =
  'https://api.freelovable.com.br/storage/v1/object/public/anexos/13e5c537-39e1-420f-bbbb-f3ae7eded199.png'

const DEFAULT_BODY = `Meu nome é Equipe Comercial e faço parte da AMT Fight Wear.

Gostaria de apresentar uma oportunidade de parceria para academias, equipes esportivas e revendedores que buscam produtos personalizados com alta qualidade.

A AMT Fight Wear fabrica:

• Kimonos personalizados para Jiu-Jitsu e Judô;
• Faixas de graduação;
• Patches bordados personalizados;
• Uniformes e roupas esportivas sob medida.

Nossos diferenciais incluem:

- Produção personalizada com a identidade visual da sua academia;
- Materiais de alta qualidade e excelente acabamento;
- Atendimento especializado durante todo o processo;
- Condições comerciais exclusivas para parceiros B2B;
- Produção para pequenas e grandes quantidades.

Nosso objetivo é ajudar nossos parceiros a oferecer produtos de alto padrão aos seus alunos, fortalecendo sua marca e gerando novas oportunidades de receita.

Caso tenha interesse, ficaremos felizes em apresentar nosso catálogo, esclarecer dúvidas e elaborar uma proposta personalizada.

Agradeço pela atenção e fico à disposição.`

const OutreachB2BEmail = ({
  leadName,
  customMessage,
  imageUrl,
}: Props) => {
  const salutation = leadName ? `Olá, ${leadName},` : 'Olá,'
  const body = (customMessage && customMessage.trim()) || DEFAULT_BODY
  const image = imageUrl || DEFAULT_IMAGE

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Parceria B2B AMT Fight Wear — kimonos, faixas e patches personalizados</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>AMT Fight Wear</Heading>
            <Text style={eyebrow}>Parceria B2B para academias e equipes</Text>
          </Section>

          <Img src={image} alt="AMT Fight Wear" width="560" style={hero} />

          <Section style={content}>
            <Text style={paragraph}>{salutation}</Text>
            {body.split('\n').map((line, i) => (
              <Text key={i} style={line.trim() ? paragraph : spacer}>
                {line}
              </Text>
            ))}

            <Hr style={hr} />

            <Text style={signature}>
              Atenciosamente,
              <br />
              <strong>Equipe Comercial</strong>
              <br />
              AMT Fight Wear
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OutreachB2BEmail,
  subject: (data: Record<string, any>) => {
    const name = data?.leadName ? ` — ${data.leadName}` : ''
    return `Parceria B2B | Kimonos, Faixas e Patches Personalizados${name}`
  },
  displayName: 'Prospect Outreach B2B',
  previewData: {
    leadName: 'Academia Exemplo',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
}
const container = {
  margin: '0 auto',
  padding: '24px 20px',
  maxWidth: '600px',
}
const header = {
  padding: '4px 0 20px',
  textAlign: 'center' as const,
}
const h1 = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#0a0a0a',
  margin: 0,
  letterSpacing: '-0.02em',
}
const eyebrow = {
  fontSize: '12px',
  color: '#737373',
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}
const hero = {
  width: '100%',
  height: 'auto',
  borderRadius: '12px',
  margin: '8px 0 20px',
  display: 'block',
}
const content = {
  padding: '0 4px',
}
const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#262626',
  margin: '0 0 12px',
}
const spacer = {
  fontSize: '8px',
  lineHeight: '8px',
  margin: 0,
}
const hr = {
  border: 'none',
  borderTop: '1px solid #e5e5e5',
  margin: '24px 0 16px',
}
const signature = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#525252',
  margin: 0,
}
