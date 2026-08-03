import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/download-extension')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o arquivo zip hospedado localmente na pasta public
        // Isso evita erros 404 de links externos
        return new Response(null, {
          status: 302,
          headers: {
            'Location': '/amt-macro-dm.zip',
            'Cache-Control': 'no-cache'
          },
        })
      }
    }
  }
})