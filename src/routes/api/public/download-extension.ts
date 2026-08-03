import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/download-extension')({
  server: {
    handlers: {
      GET: async () => {
        // Fallback: Se o link do GitHub falhar, podemos servir um blob estático ou uma mensagem de erro amigável
        // Por enquanto, redirecionamos para a URL que *deveria* ser a correta, mas com uma lógica de proxy futuro
        const downloadUrl = "https://github.com/lovable-ai-projects/prospect-macro-dm/releases/download/v2.1/macro-dm-v2.1.zip";
        
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