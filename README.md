# API do Painel da Corretora

Backend em Node.js + Express que conecta o painel (React) ao banco PostgreSQL no Aiven.

## 1. Rodar o schema no banco

Antes de tudo, crie as tabelas no seu banco Aiven. Você pode fazer isso pelo botão
**"Query editor"** dentro do próprio painel do Aiven (aba do serviço PostgreSQL):
copie e cole o conteúdo do arquivo `schema.sql` e execute.

## 2. Subir este código pro GitHub

No terminal, dentro desta pasta:

```bash
git init
git add .
git commit -m "primeira versão da API"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/backend-corretora.git
git push -u origin main
```

(Crie o repositório vazio no GitHub antes, em github.com/new)

## 3. Deploy no Render

1. No Render, clique em **New +** → **Web Service**
2. Conecte o repositório que você acabou de subir
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Em **Environment Variables**, adicione:
   - `DATABASE_URL` → cole a Service URI que você copiou do Aiven
5. Clique em **Create Web Service** e aguarde o deploy

Quando terminar, o Render vai te dar uma URL tipo:
`https://backend-corretora.onrender.com`

## 4. Testar

Acesse `https://SEU-APP.onrender.com/api/atendimentos` no navegador.
Se aparecer `[]` (uma lista vazia), está tudo funcionando.

## Próximo passo

Depois que essa URL estiver no ar, o painel (frontend) precisa ser atualizado
para chamar essa API em vez do armazenamento local — é só me avisar com a
URL do Render que eu faço esse ajuste.
