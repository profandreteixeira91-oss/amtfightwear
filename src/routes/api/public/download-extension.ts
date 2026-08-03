import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/download-extension')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o link oficial da extensão v2.1
        // O usuário relatou "not found", então centralizamos o redirecionamento aqui.
        const downloadUrl = "https://github.com/prospect-macro-dm/extension/releases/download/v2.1/macro-dm-v2.1.zip";
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': downloadUrl,
            'Cache-Control': 'no-cache'
          },
        })
      }
    }
  }
})
