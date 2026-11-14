// ======================================
// SISTEMA DE ÁUDIO TERRAS RARAS
// ======================================

const btnAudio = document.getElementById("btnAudio");

btnAudio.addEventListener("click", function() {

    // Cancela uma fala anterior
    window.speechSynthesis.cancel();

    // Mensagem que será narrada
    const mensagem =
    "Parabéns! Você tinha 100 Terras Raras " +
    "e acabou de receber mais 50 TR. " +
    "Seu saldo atual é de 150 TR. " +
    "Continue participando para ganhar mais!";

    // Cria a fala
    const fala = new SpeechSynthesisUtterance(mensagem);

    // Define o idioma português brasileiro
    fala.lang = "pt-BR";

    // Velocidade da voz
    fala.rate = 0.95;

    // Tom da voz
    fala.pitch = 1;

    // Volume
    fala.volume = 1;

    // Altera o botão durante a reprodução
    btnAudio.innerHTML = "🔊 REPRODUZINDO ÁUDIO...";

    fala.onend = function() {
        btnAudio.innerHTML = "🔊 OUVIR MENSAGEM";
    };

    fala.onerror = function() {
        btnAudio.innerHTML = "🔊 OUVIR MENSAGEM";
    };

    // Reproduz a mensagem
    window.speechSynthesis.speak(fala);

});
