# Meu Bar v2
Site estático (HTML + JS) + Supabase. Sem Django, sem React, sem build.
1. Supabase: crie um projeto NOVO -> SQL Editor -> cole `supabase/schema.sql` -> Run.
   Authentication -> Providers -> Email: desligue "Confirm email" (facilita os testes).
2. Project Settings -> API: copie a URL e a chave **anon** para `config.js` (nunca a service_role).
3. Suba a pasta num repositório novo no GitHub e importe na Vercel (Deploy).
4. No app: Mais -> Meus bares -> crie um bar -> Estoque -> Mais -> QR do cardápio.
