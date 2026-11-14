// =========================================================
// TERRAS RARAS — lógica da página inicial
// O saldo deste protótipo fica salvo neste navegador.
// =========================================================
const INITIAL_BALANCE = 150; // 100 TR iniciais + 50 TR de bônus de boas-vindas
const REWARD_AMOUNT = 50;
const STORAGE_KEY = "terrasRarasBalance";

const balanceElement = document.getElementById("balance");
const noteElement = document.getElementById("balance-note");
const feedbackElement = document.getElementById("feedback");
const toastElement = document.getElementById("toast");
const earnButton = document.getElementById("earn-button");
const footerEarnButton = document.getElementById("footer-earn-button");

function readBalance() {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(saved) && saved >= INITIAL_BALANCE ? saved : INITIAL_BALANCE;
}

let balance = readBalance();

function renderBalance() {
  balanceElement.textContent = balance.toLocaleString("pt-BR");
}

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("show");
  window.setTimeout(() => toastElement.classList.remove("show"), 2600);
}

function earnTR() {
  balance += REWARD_AMOUNT;
  localStorage.setItem(STORAGE_KEY, String(balance));
  renderBalance();

  const message = `Parabéns! Você ganhou mais ${REWARD_AMOUNT} TR.`;
  noteElement.textContent = `Seu saldo foi atualizado: ${balance} TR disponíveis.`;
  feedbackElement.textContent = `+${REWARD_AMOUNT} TR adicionados à sua carteira!`;
  showToast(message);
}

earnButton.addEventListener("click", earnTR);
footerEarnButton.addEventListener("click", earnTR);

// Os itens inferiores ainda são apenas atalhos visuais nesta primeira versão.
document.querySelectorAll("[data-section]").forEach((item) => {
  item.addEventListener("click", () => {
    showToast(`${item.dataset.section}: em breve!`);
  });
});

renderBalance();

// Registra o Service Worker para permitir instalação e cache básico.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Não foi possível registrar o Service Worker:", error);
    });
  });
}
