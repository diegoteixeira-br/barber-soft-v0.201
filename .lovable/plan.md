

## Plano: Correção do Erro 401 no n8n (Finalizar Campanha)

### Problema Identificado

O workflow n8n envia um header `x-api-key` que a Edge Function `update-campaign-status` **não reconhece**. A função espera autenticação via:
1. Campo `secret` no body JSON (método legado) - **mais simples**
2. Headers HMAC `x-signature` + `x-timestamp` (mais seguro)

### Solução: Usar o `callback_secret` do Payload Original

Quando o Lovable dispara a campanha, ele envia o `callback_secret` junto com os dados. Este valor deve ser usado em todas as chamadas de callback.

### Passo a Passo no n8n

#### 1. Verificar o Payload do Webhook Inicial

No primeiro node ("Webhook"), o payload inclui:
```json
{
  "instanceName": "...",
  "contacts": [...],
  "campaign_id": "...",
  "callback_url": "https://...supabase.co/functions/v1/campaign-callback",
  "update_status_url": "https://...supabase.co/functions/v1/update-campaign-status",
  "callback_secret": "SEU_SECRET_AQUI"  // <-- Este é o valor correto
}
```

#### 2. Configurar o Node "Finalizar Campanha"

**Parâmetros atuais (incorretos):**
- Header `x-api-key`: `dt_master_sk_2026_...` ❌

**Parâmetros corretos:**

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `{{ $('Webhook').item.json.body.update_status_url }}` |
| Headers | `Content-Type: application/json` (apenas) |
| Send Body | ✅ Habilitado |
| Body Content Type | JSON |

**JSON Body:**
```json
{
  "campaign_id": "{{ $('Webhook').item.json.body.campaign_id }}",
  "status": "completed",
  "sent_count": {{ $('Separar Lista').all().length }},
  "failed_count": 0,
  "secret": "{{ $('Webhook').item.json.body.callback_secret }}"
}
```

#### 3. Configurar Outros Nodes de Callback (se existirem)

**HTTP Callback (por mensagem):**
```json
{
  "campaign_id": "{{ $('Webhook').item.json.body.campaign_id }}",
  "log_id": "{{ $json.log_id }}",
  "status": "sent",
  "secret": "{{ $('Webhook').item.json.body.callback_secret }}"
}
```

### Checklist de Verificação

| Item | Status |
|------|--------|
| Remover header `x-api-key` | ⬜ |
| Adicionar `secret` no JSON body | ⬜ |
| Usar `callback_secret` do Webhook original | ⬜ |
| Testar disparo de campanha | ⬜ |

### Resultado Esperado

Após as alterações:
- Node "Finalizar Campanha" retorna `{"success": true}`
- Status da campanha atualiza para "completed" no banco
- Histórico de campanhas mostra campanha finalizada

### Diagrama do Fluxo Corrigido

```text
┌─────────────┐      ┌──────────────────┐      ┌────────────────────┐
│   Webhook   │ ───► │ callback_secret  │ ───► │ Finalizar Campanha │
│             │      │ é extraído aqui  │      │  usa no body JSON  │
└─────────────┘      └──────────────────┘      └────────────────────┘
       │
       └──► campaign_id, update_status_url também vêm do Webhook
```

### Alternativa: Se callback_secret não estiver chegando

Se por algum motivo o `callback_secret` não estiver no payload do Webhook, verifique:

1. No Lovable, o secret `N8N_CALLBACK_SECRET` está configurado?
2. A Edge Function `send-marketing-campaign` está enviando o campo?

Você pode verificar isso no log do node Webhook do n8n - clique no node e veja o JSON completo recebido.

