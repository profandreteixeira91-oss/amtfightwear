# WhatsApp da loja — Evolution API

A loja envia pelo WhatsApp:

- **para o dono** (números em `WHATSAPP_ADMIN_TO`): aviso de **pedido pago**, com itens, nome a bordar e link do pedido;
- **para o cliente**: pagamento confirmado, entrada em produção, envio (com rastreio) e entrega.

## Servidor

A loja usa a **mesma Evolution API do Dojo Manager** (`https://whatsapp.amtdojomanager.com.br`, v2.3.7),
com uma **instância própria** (`amt-loja`), ligada ao número da loja. As academias do Dojo têm cada uma a
sua instância no mesmo servidor; uma não interfere na outra.

O `docker-compose.yml`, o `Caddyfile` e o `.env.example` desta pasta ficam como referência, caso um dia a
loja precise de um servidor separado.

## Variáveis no worker da loja (Cloudflare)

```
EVOLUTION_API_URL=https://whatsapp.amtdojomanager.com.br
EVOLUTION_API_KEY=<a mesma chave global usada pelo Dojo Manager>   # Secret
EVOLUTION_INSTANCE=amt-loja                                        # opcional, este é o padrão
WHATSAPP_ADMIN_TO=5582999998888                                    # seu número; vários separados por vírgula
SITE_URL=https://amtfightwear.com.br                               # link "Abrir" do aviso
```

## Conectar o número da loja

Na **Central › Configurações › Notificações**, card *WhatsApp da loja*:

1. **Conectar WhatsApp da loja** → leia o QR Code com o celular da loja
   (*WhatsApp › Aparelhos conectados › Conectar aparelho*), ou use **Código de pareamento** com o número.
2. O card muda para **Conectado** sozinho e mostra o número e o perfil.
3. **Enviar teste** manda um aviso de pedido pago fictício para os números de `WHATSAPP_ADMIN_TO`.

> Use um número **só da loja**. A Evolution usa o WhatsApp Web (não é a API oficial da Meta). Os avisos daqui são
> transacionais (um por evento de pedido), o uso de menor risco de bloqueio. Se o celular ficar muito tempo
> offline, a sessão pode cair: o card mostra *Desconectado* e basta conectar de novo.
