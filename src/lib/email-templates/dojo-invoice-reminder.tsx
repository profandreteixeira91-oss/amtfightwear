import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  studentName?: string
  dojoName?: string
  amount?: string
  dueDate?: string
  daysOffset?: number
  paymentLink?: string
  pixCopyPaste?: string
  invoiceDescription?: string
}

const Email = ({
  studentName = 'aluno(a)',
  dojoName = 'Sua academia',
  amount = 'R$ 0,00',
  dueDate = '',
  daysOffset = 0,
  paymentLink,
  pixCopyPaste,
  invoiceDescription = 'Mensalidade',
}: Props) => {
  const isPreview = daysOffset < 0
  const isDueToday = daysOffset === 0
  const isOverdue = daysOffset > 0

  const title = isPreview
    ? 'Sua próxima mensalidade está chegando'
    : isDueToday
      ? 'Sua mensalidade vence hoje'
      : `Mensalidade em atraso há ${daysOffset} ${daysOffset === 1 ? 'dia' : 'dias'}`

  const intro = isPreview
    ? `Este é um lembrete amigável: sua próxima cobrança vence em ${Math.abs(daysOffset)} ${Math.abs(daysOffset) === 1 ? 'dia' : 'dias'}.`
    : isDueToday
      ? 'Passando para lembrar que sua mensalidade vence hoje. Aproveite para pagar agora e evitar juros.'
      : 'Identificamos que sua mensalidade ainda não foi paga. Regularize para continuar aproveitando todos os benefícios do dojo.'

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{title} — {dojoName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={badge(isOverdue ? '#dc2626' : isDueToday ? '#d97706' : '#0f766e')}>
            <Text style={badgeText}>{dojoName}</Text>
          </Section>

          <Heading style={heading}>{title}</Heading>
          <Text style={paragraph}>Olá, {studentName}!</Text>
          <Text style={paragraph}>{intro}</Text>

          <Section style={card}>
            <Text style={cardLabel}>Descrição</Text>
            <Text style={cardValue}>{invoiceDescription}</Text>
            <Hr style={hr} />
            <Text style={cardLabel}>Valor</Text>
            <Text style={cardValueBig}>{amount}</Text>
            {dueDate ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Vencimento</Text>
                <Text style={cardValue}>{dueDate}</Text>
              </>
            ) : null}
          </Section>

          {paymentLink ? (
            <Section style={{ textAlign: 'center', marginTop: '24px' }}>
              <Button href={paymentLink} style={button}>
                Pagar agora
              </Button>
            </Section>
          ) : null}

          {pixCopyPaste ? (
            <Section style={pixBox}>
              <Text style={cardLabel}>Pix Copia e Cola</Text>
              <Text style={pixCode}>{pixCopyPaste}</Text>
            </Section>
          ) : null}

          <Text style={footer}>
            Se você já efetuou o pagamento, desconsidere esta mensagem.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const days = Number(d.daysOffset ?? 0)
    const dojo = d.dojoName ?? 'Sua academia'
    if (days < 0) return `Sua mensalidade vence em breve — ${dojo}`
    if (days === 0) return `Sua mensalidade vence hoje — ${dojo}`
    return `Mensalidade em atraso — ${dojo}`
  },
  displayName: 'Lembrete de mensalidade (Dojo Manager)',
  previewData: {
    studentName: 'João da Silva',
    dojoName: 'AMT Dojo',
    amount: 'R$ 200,00',
    dueDate: '10/08/2026',
    daysOffset: 0,
    paymentLink: 'https://example.com/pagar',
    invoiceDescription: 'Mensalidade 2026-08',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const badge = (color: string) => ({
  backgroundColor: color,
  borderRadius: '999px',
  padding: '4px 12px',
  display: 'inline-block',
  marginBottom: '16px',
})
const badgeText = { color: '#ffffff', fontSize: '12px', margin: 0, fontWeight: 600 }
const heading = { color: '#0f172a', fontSize: '22px', margin: '8px 0 16px' }
const paragraph = { color: '#334155', fontSize: '15px', lineHeight: '22px' }
const card = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '20px',
  marginTop: '20px',
}
const cardLabel = { color: '#64748b', fontSize: '12px', textTransform: 'uppercase' as const, margin: '0 0 4px', letterSpacing: '0.05em' }
const cardValue = { color: '#0f172a', fontSize: '15px', margin: '0 0 4px', fontWeight: 500 }
const cardValueBig = { color: '#0f172a', fontSize: '24px', margin: '0 0 4px', fontWeight: 700 }
const hr = { borderColor: '#e2e8f0', margin: '12px 0' }
const button = {
  backgroundColor: '#0f766e',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const pixBox = { ...card, marginTop: '16px' }
const pixCode = {
  color: '#0f172a',
  fontFamily: 'monospace',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: 0,
}
const footer = { color: '#94a3b8', fontSize: '12px', marginTop: '24px', textAlign: 'center' as const }
