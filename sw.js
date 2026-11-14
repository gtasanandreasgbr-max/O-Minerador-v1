// Service Worker do TERRAS RARAS — cache básico para uso offline.
const CACHE_NAME = 'terras-raras-v2';
const FILES_TO_CACHE = ['./','./index.html','./style.css','./app.js','./manifest.json','./icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(caches.match(event.request).then(cached=>cached || fetch(event.request).then(response=>{
    if(response && response.status===200 && new URL(event.request.url).origin===self.location.origin){
      const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
    }
    return response;
  }).catch(()=>caches.match('./index.html'))));
});
// ÁUDIO DAS MISSÕES - TERRAS RARAS

function iniciarAudioMissao() {
  if (!("speechSynthesis" in window)) {
    alert("Seu navegador não suporta áudio de voz.");
    return;
  }

  window.speechSynthesis.cancel();

  const mensagem = new SpeechSynthesisUtterance(
    "Parabéns! Sua missão começou! " +
    "Continue participando, complete suas tarefas " +
    "e conquiste mais 50 TR em Terras Raras. " +
    "Boa sorte!"
  );

  mensagem.lang = "pt-BR";
  mensagem.rate = 0.95;
  mensagem.pitch = 1.05;
  mensagem.volume = 1;

  const vozes = window.speechSynthesis.getVoices();
  const voz = vozes.find(v => v.lang === "pt-BR");

  if (voz) {
    mensagem.voice = voz;
  }

  window.speechSynthesis.speak(mensagem);
}

document.addEventListener("DOMContentLoaded", function() {
  const botao = document.getElementById("ouvirMissao");

  if (botao) {
    botao.addEventListener("click", iniciarAudioMissao);
  }
});
// NARRAÇÃO DA EXPLICAÇÃO DA MISSÃO

function ouvirExplicacaoMissao() {
  window.speechSynthesis.cancel();

  const explicacao = document.querySelector(
    "#pagina-missoes .descricao-missao"
  );

  if (!explicacao) {
    alert("Explicação da missão não encontrada.");
    return;
  }

  const texto = explicacao.innerText.trim();

  if (!texto) {
    alert("Esta missão ainda não possui explicação.");
    return;
  }

  const fala = new SpeechSynthesisUtterance(texto);

  fala.lang = "pt-BR";
  fala.rate = 0.90;
  fala.pitch = 1;
  fala.volume = 1;

  window.speechSynthesis.speak(fala);
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("ouvirExplicacaoMissao")
    ?.addEventListener("click", ouvirExplicacaoMissao);

  document
    .getElementById("pararExplicacaoMissao")
    ?.addEventListener("click", () => {
      window.speechSynthesis.cancel();
    });
});
