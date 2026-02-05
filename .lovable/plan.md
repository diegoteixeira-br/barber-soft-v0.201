
# Plano: Implementar reCAPTCHA Enterprise no Formulário de Contato

## Configuração Confirmada
- **Site Key**: `6Le2q2EsAAAAALI1XXCLYyPsl3gfaulb_0JgYXs7`
- **Secret Key**: Configurada como `RECAPTCHA_SECRET_KEY` nos secrets
- **Tipo**: reCAPTCHA Enterprise (Google Cloud)

## Implementação

### 1. Criar Edge Function: `supabase/functions/contact-form/index.ts`

```typescript
// Validação do token reCAPTCHA Enterprise
const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
const formData = new URLSearchParams();
formData.append("secret", RECAPTCHA_SECRET_KEY);
formData.append("response", token);

const response = await fetch(verifyUrl, {
  method: "POST",
  body: formData.toString(),
});

const result = await response.json();
// Aceitar apenas score >= 0.5
```

### 2. Atualizar Frontend: `src/pages/institucional/Contato.tsx`

**Carregar script Enterprise:**
```typescript
const script = document.createElement('script');
script.src = `https://www.google.com/recaptcha/enterprise.js?render=${SITE_KEY}`;
document.head.appendChild(script);
```

**Gerar token no submit:**
```typescript
const token = await window.grecaptcha.enterprise.execute(SITE_KEY, { 
  action: 'contact_form' 
});
```

**Enviar para edge function:**
```typescript
const { data, error } = await supabase.functions.invoke('contact-form', {
  body: { name, phone, email, subject, message, recaptchaToken }
});
```

### 3. Atualizar Config: `supabase/config.toml`

```toml
[functions.contact-form]
verify_jwt = false
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/contact-form/index.ts` | Criar |
| `src/pages/institucional/Contato.tsx` | Modificar |
| `supabase/config.toml` | Adicionar função |

## Funcionalidades

1. **Carregamento invisível** - Script carrega em background
2. **Validação por score** - Rejeita se score < 0.5
3. **Feedback visual** - Botão desabilitado enquanto carrega
4. **Texto legal** - Links para políticas do Google (obrigatório)
5. **Logs detalhados** - Para monitoramento de tentativas

## Resultado Esperado

- Bots serão bloqueados automaticamente
- Usuários legítimos não verão captcha visual
- Score baixo = erro "Verificação de segurança falhou"
