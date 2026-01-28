
# Plano: Sanitização Dinâmica de Telefones com DDD da Unidade

## Resumo

Criar um trigger de banco de dados que sanitiza automaticamente os telefones antes de salvar, usando o DDD da unidade associada quando o número estiver incompleto.

## Análise do Estado Atual

### Problema Identificado
Os telefones estão sendo salvos em formatos inconsistentes:
- `(65) 99999-9998` (formatado com máscara)
- `6599891722` (apenas números com DDD)
- `98985847358` (número de outra região)
- `99999-9998` (sem DDD)

### Tabelas Afetadas
| Tabela | Campo | Prioridade |
|--------|-------|------------|
| `clients` | `phone` | **Alta** - Principal |
| `appointments` | `client_phone` | **Alta** - Usado para sync |
| `barbers` | `phone` | Média |
| `product_sales` | `client_phone` | Baixa |
| `cancellation_history` | `client_phone` | Baixa (histórico) |
| `appointment_deletions` | `client_phone` | Baixa (histórico) |

### Fonte do DDD Padrão
A tabela `units` possui o campo `phone` que contém o telefone da unidade (ex: `65996141516`). Os primeiros 2 dígitos após remover o 55 serão usados como DDD padrão.

## Solução Proposta

### Parte 1: Função de Sanitização

Criar uma função PostgreSQL reutilizável:

```sql
CREATE OR REPLACE FUNCTION sanitize_brazilian_phone(
  raw_phone TEXT,
  unit_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  digits TEXT;
  unit_phone TEXT;
  unit_ddd TEXT;
BEGIN
  -- 1. Remover tudo que não for número
  digits := regexp_replace(raw_phone, '\D', '', 'g');
  
  -- Se vazio, retorna NULL
  IF digits IS NULL OR digits = '' THEN
    RETURN NULL;
  END IF;
  
  -- 2. Verificar comprimento e completar
  
  -- Caso completo (12+ dígitos): já tem código de país
  IF length(digits) >= 12 THEN
    IF left(digits, 2) = '55' THEN
      RETURN digits; -- Já está completo
    ELSE
      RETURN '55' || digits; -- Adiciona 55
    END IF;
  END IF;
  
  -- Caso com DDD (10-11 dígitos): adiciona apenas 55
  IF length(digits) >= 10 AND length(digits) <= 11 THEN
    RETURN '55' || digits;
  END IF;
  
  -- Caso local (8-9 dígitos): precisa buscar DDD da unidade
  IF length(digits) >= 8 AND length(digits) <= 9 THEN
    -- Buscar telefone da unidade para extrair DDD
    IF unit_id IS NOT NULL THEN
      SELECT phone INTO unit_phone FROM units WHERE id = unit_id;
      
      IF unit_phone IS NOT NULL THEN
        -- Extrair DDD do telefone da unidade
        unit_phone := regexp_replace(unit_phone, '\D', '', 'g');
        
        -- Se tem 55 no início, pular
        IF left(unit_phone, 2) = '55' AND length(unit_phone) >= 4 THEN
          unit_ddd := substr(unit_phone, 3, 2);
        ELSIF length(unit_phone) >= 2 THEN
          unit_ddd := left(unit_phone, 2);
        END IF;
        
        -- Montar número completo
        IF unit_ddd IS NOT NULL AND length(unit_ddd) = 2 THEN
          RETURN '55' || unit_ddd || digits;
        END IF;
      END IF;
    END IF;
    
    -- Sem DDD disponível, retorna o número como está
    RETURN digits;
  END IF;
  
  -- Número muito curto, retorna como está
  RETURN digits;
END;
$$ LANGUAGE plpgsql;
```

### Parte 2: Trigger para Tabela `clients`

```sql
CREATE OR REPLACE FUNCTION sanitize_client_phone_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Sanitiza o telefone usando a função
  NEW.phone := sanitize_brazilian_phone(NEW.phone, NEW.unit_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sanitize_client_phone
  BEFORE INSERT OR UPDATE OF phone ON clients
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_client_phone_trigger();
```

### Parte 3: Trigger para Tabela `appointments`

```sql
CREATE OR REPLACE FUNCTION sanitize_appointment_phone_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Sanitiza o telefone do cliente
  NEW.client_phone := sanitize_brazilian_phone(NEW.client_phone, NEW.unit_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sanitize_appointment_phone
  BEFORE INSERT OR UPDATE OF client_phone ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_appointment_phone_trigger();
```

### Parte 4: Migration para Dados Existentes (Opcional)

Após criar os triggers, podemos normalizar os dados existentes:

```sql
-- Normalizar telefones de clientes existentes
UPDATE clients c
SET phone = sanitize_brazilian_phone(phone, unit_id)
WHERE phone IS NOT NULL;

-- Normalizar telefones de agendamentos
UPDATE appointments a
SET client_phone = sanitize_brazilian_phone(client_phone, unit_id)
WHERE client_phone IS NOT NULL;
```

## Exemplos de Comportamento

| Input | DDD Unidade | Resultado |
|-------|-------------|-----------|
| `(65) 99999-9998` | - | `5565999999998` |
| `99999-9998` | `65` | `556599999998` |
| `999999998` | `11` | `5511999999998` |
| `6599891722` | - | `556599891722` |
| `556599891722` | - | `556599891722` |

## Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| Nova migration SQL | Criar função + triggers |
| Frontend (opcional) | Nenhuma alteração necessária - sanitização é transparente |

---

## Seção Técnica

### Fluxo de Execução

```text
+------------------+     +-------------------+     +------------------+
| Insert/Update    |     | BEFORE Trigger    |     | Dados Salvos     |
| phone = "(65)    |---->| sanitize_phone()  |---->| phone =          |
| 99999-9998"      |     |                   |     | "5565999999998"  |
+------------------+     +-------------------+     +------------------+
                                |
                                v
                         +--------------+
                         | Extrai DDD   |
                         | da Unidade   |
                         | se necessário|
                         +--------------+
```

### Lógica de Extração do DDD

1. Remove caracteres não numéricos do telefone da unidade
2. Se começa com `55` e tem 4+ dígitos → DDD são os dígitos 3-4
3. Caso contrário → DDD são os primeiros 2 dígitos

### Considerações de Performance

- Trigger `BEFORE` não adiciona overhead significativo
- Função usa apenas operações de string (sem JOINs complexos)
- Busca da unidade é por chave primária (índice)

### Compatibilidade

- Não quebra nenhum código existente
- Frontend continua enviando telefones formatados
- Backend normaliza transparentemente
- Buscas por telefone funcionam pois todos ficam no mesmo formato
