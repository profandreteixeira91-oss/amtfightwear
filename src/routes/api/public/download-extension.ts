import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/download-extension')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o link do GitHub, que é a fonte oficial da extensão
        // O usuário relatou "not found" ao baixar, então garantimos uma rota interna 
        // estável que redireciona para o binário correto.
        const githubUrl = "https://github.com/prospect-macro-dm/extension/releases/latest/download/macro-dm-v2.1.zip";
        
        return new Response(null, {
          status: 302,
          headers: {
            Location: githubUrl,
          },
        })
      }
    }
  }
})
