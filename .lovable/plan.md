
# Plano: Exibir Forma de Pagamento no Modal de Detalhes

## Objetivo
Adicionar a exibição da forma de pagamento no modal de detalhes do agendamento quando ele estiver finalizado.

## Análise

O campo `payment_method` já existe na interface `Appointment` e é preenchido quando o agendamento é finalizado. O modal atual já mostra todas as informações, mas falta apenas exibir a forma de pagamento.

## Implementação

### Arquivo: `src/components/agenda/AppointmentDetailsModal.tsx`

1. **Importar ícone**: Adicionar `Wallet` do lucide-react para representar pagamento
2. **Criar função helper**: Mapear os códigos internos para labels amigáveis em português
3. **Adicionar exibição condicional**: Mostrar a forma de pagamento quando o agendamento estiver finalizado (`status === "completed"`)

### Mapeamento de Métodos de Pagamento

| Código | Label | Ícone/Cor |
|--------|-------|-----------|
| cash | Dinheiro | Verde |
| pix | PIX | Azul |
| debit_card | Débito | Laranja |
| credit_card | Crédito | Roxo |
| courtesy | Cortesia | Rosa |
| fidelity_courtesy | Cortesia (Fidelidade) | Rosa |

### Local na Interface

A informação será exibida junto com as outras informações (horário, telefone, barbeiro, serviço), logo após o serviço:

```
⏰ 10:00 - 10:30
📞 5565999891722
👤 JEFF
✂️ Corte Masculino (30 min)
💳 Dinheiro                   ← NOVO
```

## Resultado Esperado

Quando um agendamento estiver com status "Finalizado", o modal mostrará a forma de pagamento usada, facilitando a conferência sem precisar ir ao módulo financeiro.
