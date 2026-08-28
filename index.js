const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const OpenAI = require("openai");

admin.initializeApp();

const openAiKey = defineSecret("OPENAI_API_KEY");
const openAiModel = defineString("OPENAI_MODEL_NAME", { default: "gpt-4o-mini" });

exports.analyzeWithGPT = onCall({ secrets: [openAiKey] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Usuário não autenticado.");

  const prompt = request.data?.prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0 || prompt.length > 200) {
    throw new HttpsError("invalid-argument", "Pergunta inválida ou muito longa. Máximo de 200 caracteres.");
  }

  const db = admin.database();
  const userSnap = await db.ref(`users/${request.auth.uid}`).once("value");
  const role = userSnap.child("role").val();

  if (!["admin", "cashier", "operator"].includes(role)) {
    throw new HttpsError("permission-denied", "Acesso negado para o seu papel.");
  }

  const ordersSnap = await db.ref("orders").once("value");
  const rawOrders = ordersSnap.val() || {};

  const filteredOrders = Object.values(rawOrders)
    .filter((order) => order && typeof order === "object")
    .map((order) => ({
      status: typeof order.status === "string" ? order.status : null,
      total: typeof order.total === "number" ? order.total : 0,
      createdAt: typeof order.createdAt === "number" || typeof order.createdAt === "string" ? order.createdAt : null,
      itemCount: order.products && typeof order.products === "object" ? Object.keys(order.products).length : 0
    }));

  let filteredClosings = [];
  if (role === "admin" || role === "cashier") {
    const snap = await db.ref("cashClosings").once("value");
    const closings = snap.val() || {};
    filteredClosings = Object.entries(closings).map(([date, c]) => {
      if (!c || typeof c !== "object") return null;
      return {
        date,
        finalized: c.finalized === true,
        salesTotal: typeof c.salesTotal === "number" ? c.salesTotal : 0,
        expectedCash: typeof c.expectedCash === "number" ? c.expectedCash : 0
      };
    }).filter(Boolean);
  }

  try {
    const openai = new OpenAI({ apiKey: openAiKey.value() });
    const dataContext = JSON.stringify({ orders: filteredOrders, cashClosings: filteredClosings });

    const response = await openai.chat.completions.create({
      model: openAiModel.value(),
      messages: [
        {
          role: "system",
          content: "Você é o assistente analítico do Akatsuky Delivery. Analise somente os dados operacionais fornecidos. Responda de forma objetiva. Não invente informações. Nunca solicite, revele ou tente inferir nome, telefone, endereço ou outros dados pessoais de clientes."
        },
        {
          role: "user",
          content: `Dados operacionais:\n${dataContext}\n\nPergunta:\n${prompt.trim()}`
        }
      ]
    });

    const answer = response.choices?.[0]?.message?.content;
    if (!answer) throw new Error("A OpenAI não retornou uma resposta.");
    return { answer };
  } catch (error) {
    throw new HttpsError("internal", "Erro ao processar a análise com IA.");
  }
});
