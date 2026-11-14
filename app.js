// TERRAS RARAS — lógica da carteira e das missões.
// Atenção: esta versão é demonstrativa. localStorage não é carteira financeira segura.
const STORAGE_KEY = 'terrasRarasBalance';
const MISSION_KEY = 'terrasRarasInstallMission';
const REWARD_AMOUNT = 50;
const DEFAULT_BALANCE = 600;

const balanceElement = document.getElementById('balance');
const noteElement = document.getElementById('balance-note');
const homePage = document.getElementById('homePage');
const missionPage = document.getElementById('missionPage');
const claimButton = document.getElementById('claimButton');
const toast = document.getElementById('toast');
let deferredInstallPrompt = null;
let toastTimer;

function readBalance(){
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  return localStorage.getItem(STORAGE_KEY) !== null && Number.isFinite(saved) && saved >= 0 ? saved : DEFAULT_BALANCE;
}
let balance = readBalance();
function renderBalance(){
  balanceElement.textContent = balance.toLocaleString('pt-BR');
  localStorage.setItem(STORAGE_KEY, String(balance));
}
function showToast(message){
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toast.classList.remove('show'),3000);
}
function openMission(){homePage.hidden = true;missionPage.hidden = false;window.scrollTo(0,0);}
function closeMission(){missionPage.hidden = true;homePage.hidden = false;window.scrollTo(0,0);}
function missionDone(){return localStorage.getItem(MISSION_KEY) === 'true';}
function updateMissionButton(){
  if(missionDone()){
    claimButton.textContent = 'MISSÃO JÁ CONCLUÍDA';
    claimButton.disabled = true;
    claimButton.style.opacity = '.6';
  }
}
function completeMission(){
  if(missionDone()){showToast('Você já concluiu esta missão.');return;}
  if(!confirm('Confirma que concluiu a missão? Nesta versão demonstrativa, a confirmação é manual.')) return;
  balance += REWARD_AMOUNT;
  localStorage.setItem(MISSION_KEY,'true');
  renderBalance();
  updateMissionButton();
  noteElement.textContent = 'Missão concluída: +50 TR adicionados.';
  showToast('Parabéns! Você recebeu mais 50 TR!');
}
async function installApp(){
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    showToast(choice.outcome === 'accepted' ? 'Solicitação de instalação aceita.' : 'Instalação cancelada.');
    deferredInstallPrompt = null;
  }else{
    alert('No Chrome, abra o menu ⋮ e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”, se a opção estiver disponível.');
  }
}
function speakMessage(){
  if(!('speechSynthesis' in window)){showToast('Este navegador não oferece leitura de voz.');return;}
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`Bem-vindo ao Terras Raras. Seu saldo atual é de ${balance} TR. Participe das missões e descubra novas oportunidades.`);
  utterance.lang = 'pt-BR';utterance.rate = .95;
  const button = document.getElementById('btnAudio');
  button.textContent = '🔊 REPRODUZINDO ÁUDIO...';
  utterance.onend = ()=>button.textContent = '🔊 OUVIR MENSAGEM';
  utterance.onerror = ()=>button.textContent = '🔊 OUVIR MENSAGEM';
  window.speechSynthesis.speak(utterance);
}

document.getElementById('openMissionButton').addEventListener('click',openMission);
document.getElementById('backButton').addEventListener('click',closeMission);
document.getElementById('installButton').addEventListener('click',installApp);
claimButton.addEventListener('click',completeMission);
document.getElementById('btnAudio').addEventListener('click',speakMessage);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;});

renderBalance();
updateMissionButton();
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Falha ao registrar Service Worker:',error)));
}
