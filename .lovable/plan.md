
# Plano: Corrigir Confirmação de Agendamento via WhatsApp

## Problema Identificado

A função `handleConfirmAppointment` não está usando a mesma lógica de normalização de telefone que as outras funções da API. Ela não gera todas as variantes necessárias (com/sem 9º dígito, com/sem código país).

### Exemplo do Erro
- Telefone recebido do n8n: `556599891722`
- Telefone salvo no appointment: `5565999891722` (com 9º dígito)
- Variantes testadas pela função: `['6599891722', '556599891722']`
- Variante que encontraria: `5565999891722` (não está sendo testada!)

## Solução Técnica

### Arquivo: `supabase/functions/agenda-api/index.ts`

Modificar a função `handleConfirmAppointment` (linha ~1818) para usar a função `getPhoneVariations()` que já existe no código e gera todas as variantes corretas.

```typescript
// ANTES (linha ~1830-1841):
let normalizedPhone = phone.replace(/\D/g, "");
if (normalizedPhone.startsWith("55") && normalizedPhone.length > 11) {
  normalizedPhone = normalizedPhone.substring(2);
}
const phoneVariants = [normalizedPhone];
if (!normalizedPhone.startsWith("55")) {
  phoneVariants.push("55" + normalizedPhone);
}

// DEPOIS:
const normalizedPhone = normalizePhoneToStandard(phone); // Converte para 13 dígitos padrão
const phoneVariants = [
  normalizedPhone,
  ...getPhoneVariations(normalizedPhone),
  phone.replace(/\D/g, '') // Telefone original sem formatação
];
// Remover duplicatas
const uniqueVariants = [...new Set(phoneVariants)].filter(Boolean);
```

Isso vai gerar todas as variantes:
- `5565999891722` (padrão 13 dígitos)
- `556599891722` (sem 9º dígito)
- `65999891722` (sem código país, com 9)
- `6599891722` (sem código país, sem 9)

## Sobre o Erro "chat_messages_barbersoft_pkey"

Esse erro é do **n8n**, não do BarberSoft. O nó "Criar Cliente" no n8n está tentando inserir dados numa tabela `chat_messages_barbersoft` que não existe no banco.

### Ação Necessária no n8n
1. Abrir o nó "Criar Cliente" no n8n
2. Verificar a configuração do "Table Name or ID"
3. Se a tabela for necessária: criar ela no Lovable Cloud
4. Se não for necessária: remover ou desativar esse nó

## Resultado Esperado

Após a implementação:
1. A confirmação via WhatsApp vai funcionar independente do formato do telefone
2. O sistema vai encontrar agendamentos mesmo com variações de 9º dígito
3. Diego Teixeira e outros clientes poderão confirmar pelo WhatsApp automaticamente
