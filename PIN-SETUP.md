# Login por PIN — Akatsuky Delivery

Este pacote troca o login do painel por **funcionário + PIN**. O PIN não fica no HTML/JS nem no GitHub. A validação acontece em uma Cloud Function e o Firebase recebe um Custom Token. As Security Rules e os dados existentes não são alterados.

## Configurar os PINs

Na pasta `functions`, cadastre um único Secret Manager secret com JSON no formato:

```json
{
  "admin": {"uid": "UID_DO_ADMIN", "pin": "PIN_DO_ADMIN"},
  "operator": {"uid": "UID_DO_OPERADOR", "pin": "PIN_DO_OPERADOR"},
  "cashier": {"uid": "UID_DO_CAIXA", "pin": "PIN_DO_CAIXA"}
}
```

Comando:

`firebase functions:secrets:set PIN_USERS_JSON`

Quando o CLI pedir o valor, cole o JSON acima com seus valores reais.

Depois instale e publique as Functions:

`cd functions`
`npm install`
`cd ..`
`firebase deploy --only functions`

O projeto precisa estar em um plano que permita Cloud Functions em produção (Blaze).
