# Akatsuky Delivery Sushi — Firebase

Projeto configurado para o Realtime Database e Firebase Hosting.

## 1. Projeto
O frontend já está apontado para o projeto Firebase `akatsuky-delivery` em `firebase-config.js`.

## 2. Regras
O arquivo `database.rules.json` contém as regras necessárias para a versão atual.

IMPORTANTE: estas regras mantêm o comportamento da versão atual (cliente acessa pedidos para acompanhamento e o painel usa PIN no navegador). Para segurança de produção, o ideal é migrar o painel para Firebase Authentication + regras por usuário/admin.

## 3. Publicar
Na pasta deste projeto:

```bash
npm install -g firebase-tools
firebase login
firebase use akatsuky-delivery
firebase deploy --only database,hosting
```

Se o projeto ainda não estiver selecionado:

```bash
firebase use --add
```

Escolha `akatsuky-delivery`.

## 4. Estrutura usada pelo app
- `orders/` — pedidos
- `menu/` — cardápio
- `settings/storeOpen` — estado aberto/fechado da loja
- `cashClosings/AAAA-MM-DD` — fechamento diário

## 5. Primeiro uso
Abra o site publicado e faça um pedido de teste. Depois abra `/admin.html`.

PIN do painel atual: 1234
PIN do caixa atual: 5678

Altere esses PINs no `admin.js` antes de produção.
