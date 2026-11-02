# WhatsApp da loja — Evolution API

A loja envia pelo WhatsApp:

- **para o dono** (números em `WHATSAPP_ADMIN_TO`): aviso de **pedido pago**, com itens, nome a bordar e link do pedido;
- **para o cliente**: pagamento confirmado, entrada em produção, envio (com rastreio) e entrega.

O envio é feito pela [Evolution API](https://github.com/EvolutionAPI/evolution-api) v2, hospedada numa VPS
própria (ela não roda no Cloudflare Worker da loja).

## 1. Subir a Evolution na VPS

Requisitos: VPS Linux com Docker (1 vCPU / 1 GB de RAM bastam) e um subdomínio apontando para o IP dela
(ex.: `whatsapp.amtfightwear.com.br`, registro A, sem proxy da Cloudflare na primeira emissão do certificado).

```bash
mkdir -p ~/evolution && cd ~/evolution
# copie docker-compose.yml, Caddyfile e .env.example desta pasta
cp .env.example .env && nano .env   # troque todos os "TROCAR"
docker compose up -d
```

O painel fica em `https://whatsapp.amtfightwear.com.br/manager` (login com a `AUTHENTICATION_API_KEY`).

## 2. Conectar o número da loja

No painel: **Create instance** → nome `amt-loja`, integração **Baileys** → **Connect** → leia o QR Code no
WhatsApp do celular da loja (*Aparelhos conectados → Conectar aparelho*). O estado deve ficar **open**.

> Use um número **só da loja**. A Evolution usa o WhatsApp Web (não é a API oficial da Meta): disparos em
> massa, mensagens para quem nunca falou com a loja ou textos idênticos em sequência aumentam o risco de
> bloqueio do número. Os avisos daqui são transacionais (um por evento de pedido), o caso de menor risco.

## 3. Ligar na loja

Nos segredos do servidor da loja (ou `.env.local` para testar localmente):

```
EVOLUTION_API_URL=https://whatsapp.amtfightwear.com.br
EVOLUTION_API_KEY=<AUTHENTICATION_API_KEY ou o token da instância>
EVOLUTION_INSTANCE=amt-loja
WHATSAPP_ADMIN_TO=5582999998888          # seu número; vários separados por vírgula
SITE_URL=https://amtfightwear.com.br     # usado no link "Abrir" do aviso
```

Depois, em **Central › Configurações › Notificações**, o card *WhatsApp da loja* deve mostrar
**Ativo**; use **Enviar teste** para receber um aviso fictício.

## Manutenção

- Atualizar: troque a tag da imagem no `docker-compose.yml` e rode `docker compose pull && docker compose up -d`.
- Se o celular da loja ficar muito tempo offline, a sessão pode cair: o card mostra *Desconectado* —
  basta ler o QR Code de novo no painel.
- Backup: os volumes `evolution_instances` e `postgres_data` guardam a sessão e o histórico.
