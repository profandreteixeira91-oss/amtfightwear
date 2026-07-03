import { useEffect, useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'confirmed' | 'error'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({ meta: [{ title: 'Cancelar Inscrição — AMT Fight Wear' }] }),
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) || '' }),
  component: UnsubscribePage,
})

function UnsubscribePage() {
  const { token } = useSearch({ from: '/unsubscribe' })
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) return setStatus('invalid')
        if (j.valid === false && j.reason === 'already_unsubscribed') return setStatus('already')
        if (j.valid) return setStatus('valid')
        setStatus('invalid')
      })
      .catch(() => setStatus('error'))
  }, [token])

  const confirm = async () => {
    setStatus('loading')
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const j = await r.json()
      if (r.ok && j.success) return setStatus('confirmed')
      if (j.reason === 'already_unsubscribed') return setStatus('already')
      setError(j.error || 'Falha ao processar.')
      setStatus('error')
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">AMT Fight Wear</h1>
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Verificando...</p>
            </div>
          )}
          {status === 'valid' && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirma o cancelamento da sua inscrição? Você não receberá mais e-mails da AMT Fight Wear.
              </p>
              <Button onClick={confirm} className="w-full">Confirmar cancelamento</Button>
            </>
          )}
          {status === 'confirmed' && (
            <div className="space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
              <p className="font-medium">Inscrição cancelada</p>
              <p className="text-sm text-muted-foreground">Você não receberá mais nossos e-mails. Obrigado!</p>
            </div>
          )}
          {status === 'already' && (
            <div className="space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
              <p className="font-medium">Você já cancelou sua inscrição</p>
            </div>
          )}
          {(status === 'invalid' || status === 'error') && (
            <div className="space-y-2">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <p className="font-medium">Link inválido ou expirado</p>
              {error && <p className="text-xs text-muted-foreground">{error}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
