/**
 * TERRAS RARAS — Núcleo Unificado da Aplicação (app.js)
 * Gerencia:
 * 1. Carteira TR persistente (fonte única de dados em todas as páginas)
 * 2. Proteção contra recompensas duplicadas
 * 3. Sistema de síntese de voz (SpeechSynthesis) em Português do Brasil (pt-BR)
 * 4. Registro de Service Worker e fluxo de instalação PWA (beforeinstallprompt)
 * 5. Renderização dinâmica de Histórico, Conquistas e Configurações
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. CONFIGURAÇÕES E CONSTANTES DO SISTEMA
  // =========================================================================
  const STORAGE_KEY = 'terras_raras_wallet_v1';
  const INITIAL_BALANCE = 600;
  const INSTALL_MISSION_ID = 'missao_instalar_app';
  const INSTALL_MISSION_REWARD = 50;

  // Variável global para armazenar o evento de instalação nativa do navegador
  let deferredInstallPrompt = null;

  // =========================================================================
  // 2. CAMADA DE DADOS DA CARTEIRA (PREPARADA PARA FUTURA INTEGRAÇÃO API/DB)
  // =========================================================================
  const WalletService = {
    getDefaultState() {
      const now = new Date().toLocaleString('pt-BR');
      return {
        userId: 'demo-local-user',
        balance: INITIAL_BALANCE,
        completedMissions: {},
        history: [
          {
            id: 'tx_inicial_600',
            missionId: 'saldo_inicial_demo',
            title: 'Saldo Inicial Demonstrativo',
            description: 'Crédito demonstrativo inicial da carteira TERRAS RARAS.',
            amount: INITIAL_BALANCE,
            timestamp: now
          }
        ],
        preferences: {
          voiceRate: 1.0
        }
      };
    },

    loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          const initial = this.getDefaultState();
          this.saveState(initial);
          return initial;
        }
        const parsed = JSON.parse(raw);
        if (typeof parsed.balance !== 'number' || !Array.isArray(parsed.history)) {
          const reset = this.getDefaultState();
          this.saveState(reset);
          return reset;
        }
        if (!parsed.completedMissions || typeof parsed.completedMissions !== 'object') {
          parsed.completedMissions = {};
        }
        if (!parsed.preferences || typeof parsed.preferences !== 'object') {
          parsed.preferences = { voiceRate: 1.0 };
        }
        return parsed;
      } catch (err) {
        console.error('Erro ao ler dados da carteira:', err);
        return this.getDefaultState();
      }
    },

    saveState(state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Erro ao salvar dados da carteira:', err);
      }
    },

    getBalance() {
      return this.loadState().balance;
    },

    isMissionCompleted(missionId) {
      const state = this.loadState();
      return Boolean(state.completedMissions && state.completedMissions[missionId]);
    },

    claimMissionReward(missionId, title, description, amount) {
      const state = this.loadState();

      // Proteção rígida contra recebimento duplicado
      if (state.completedMissions[missionId]) {
        return {
          success: false,
          alreadyClaimed: true,
          message: 'Esta missão já foi concluída e a recompensa de ' + amount + ' TR já foi creditada.'
        };
      }

      const timestamp = new Date().toLocaleString('pt-BR');
      state.balance += amount;
      state.completedMissions[missionId] = {
        completedAt: timestamp,
        reward: amount
      };

      state.history.unshift({
        id: 'tx_' + Date.now(),
        missionId: missionId,
        title: title,
        description: description,
        amount: amount,
        timestamp: timestamp
      });

      this.saveState(state);
      return {
        success: true,
        alreadyClaimed: false,
        newBalance: state.balance,
        message: 'Parabéns! +' + amount + ' TR adicionados à sua carteira demonstrativa.'
      };
    },

    resetDemoData() {
      const freshState = this.getDefaultState();
      this.saveState(freshState);
      return freshState;
    }
  };

  // =========================================================================
  // 3. SISTEMA DE SÍNTESE DE VOZ (SPEECHSYNTHESIS PT-BR)
  // =========================================================================
  const VoiceNarrator = {
    isSupported() {
      return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    },

    getPortugueseVoice() {
      if (!this.isSupported()) return null;
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return null;

      // Prioriza voz pt-BR exata, depois qualquer voz em português
      return (
        voices.find((v) => v.lang && v.lang.toLowerCase() === 'pt-br') ||
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('pt')) ||
        null
      );
    },

    stop() {
      if (!this.isSupported()) return;
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Falha ao interromper áudio:', e);
      }
      this.updateStatus('Áudio parado.');
    },

    updateStatus(text) {
      const statusEl = document.getElementById('audio-status-text');
      if (statusEl) {
        statusEl.textContent = text;
      }
    },

    speak(text, label) {
      if (!this.isSupported()) {
        showToast('Seu navegador não suporta narração por voz.');
        this.updateStatus('Narração por voz indisponível neste navegador.');
        return;
      }

      // Garante que nunca haja múltiplos áudios simultâneos
      window.speechSynthesis.cancel();

      const state = WalletService.loadState();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = state.preferences.voiceRate || 1.0;
      utterance.pitch = 1.0;

      const ptVoice = this.getPortugueseVoice();
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onstart = () => {
        this.updateStatus('Reproduzindo: ' + (label || 'Narração em português...'));
      };

      utterance.onend = () => {
        this.updateStatus('Narração concluída. Toque para ouvir novamente.');
      };

      utterance.onerror = (event) => {
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          this.updateStatus('Não foi possível reproduzir o áudio neste dispositivo.');
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Carrega vozes assíncronas em navegadores Chromium/Android
  if (VoiceNarrator.isSupported() && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = () => {
      VoiceNarrator.getPortugueseVoice();
    };
  }

  // Interrompe áudio ao sair da página
  window.addEventListener('beforeunload', () => {
    VoiceNarrator.stop();
  });

  // =========================================================================
  // 4. UTILITÁRIOS DE INTERFACE E NOTIFICAÇÃO
  // =========================================================================
  function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3600);
  }

  function syncWalletUI() {
    const balance = WalletService.getBalance();
    const formatted = balance.toLocaleString('pt-BR') + ' TR';

    document.querySelectorAll('[data-wallet-balance]').forEach((el) => {
      el.textContent = formatted;
    });
  }

  // =========================================================================
  // 5. PWA: REGISTRO DO SERVICE WORKER E INSTALAÇÃO
  // =========================================================================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            // Verifica atualizações do Service Worker
            reg.update().catch(() => {});
          })
          .catch((err) => {
            console.warn('Registro do Service Worker falhou:', err);
          });
      });
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButtonsUI(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallButtonsUI(false);
    showToast('Aplicativo TERRAS RARAS instalado com sucesso!');
  });

  function updateInstallButtonsUI(canPromptNatively) {
    document.querySelectorAll('[data-pwa-install-btn]').forEach((btn) => {
      if (canPromptNatively) {
        btn.textContent = '📲 INSTALAR APLICATIVO AGORA';
      } else {
        btn.textContent = '📲 INSTALAR APLICATIVO (INSTRUÇÕES)';
      }
    });
  }

  async function handleInstallClick() {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      showToast('O TERRAS RARAS já está aberto como aplicativo instalado!');
      return;
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('Instalação iniciada! Aguarde a conclusão no seu dispositivo.');
      } else {
        showToast('Instalação cancelada. Você pode instalar a qualquer momento.');
      }
      deferredInstallPrompt = null;
      updateInstallButtonsUI(false);
    } else {
      // Exibe instruções claras para navegadores sem prompt automático (ex: Safari iOS ou menu manual)
      const manualBox = document.getElementById('manual-install-guide');
      if (manualBox) {
        manualBox.style.display = 'block';
        manualBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast('Use o menu do navegador ("Adicionar à tela inicial" ou "Instalar app").');
    }
  }

  // =========================================================================
  // 6. CONTROLADORES ESPECÍFICOS DE CADA PÁGINA
  // =========================================================================
  function initHomePage() {
    const btnWelcomeAudio = document.getElementById('btn-welcome-audio');
    if (btnWelcomeAudio) {
      btnWelcomeAudio.addEventListener('click', () => {
        const msg =
          'Bem-vindo à sua carteira TR! Acompanhe seu saldo, participe das missões e descubra novas oportunidades no universo TERRAS RARAS.';
        VoiceNarrator.speak(msg, 'Mensagem de boas-vindas');
      });
    }

    const missionStatusBadge = document.getElementById('home-mission-status');
    if (missionStatusBadge) {
      if (WalletService.isMissionCompleted(INSTALL_MISSION_ID)) {
        missionStatusBadge.textContent = '✔ MISSÃO CONCLUÍDA';
        missionStatusBadge.className = 'badge badge-emerald';
      }
    }
  }

  function initMissionPage() {
    const btnExplain = document.getElementById('btn-audio-explain');
    const btnSteps = document.getElementById('btn-audio-steps');
    const btnStop = document.getElementById('btn-audio-stop');
    const btnComplete = document.getElementById('btn-complete-mission');
    const statusBox = document.getElementById('mission-completion-status');

    if (btnExplain) {
      btnExplain.addEventListener('click', () => {
        const text =
          'Missão Especial: Instale o aplicativo TERRAS RARAS no seu dispositivo. ' +
          'O objetivo desta missão é instalar o aplicativo como um Web App para acesso rápido e offline. ' +
          'Ao concluir esta missão, você recebe uma recompensa demonstrativa de mais 50 TR na sua carteira. ' +
          'Para participar, instale o aplicativo pelo navegador e depois toque no botão para concluir a missão e resgatar seus 50 TR.';
        VoiceNarrator.speak(text, 'Explicação completa da missão');
      });
    }

    if (btnSteps) {
      btnSteps.addEventListener('click', () => {
        const text =
          'Passo a passo da missão. ' +
          'Passo 1: Abra o TERRAS RARAS no navegador. ' +
          'Passo 2: Toque em Instalar aplicativo, quando essa opção estiver disponível. ' +
          'Passo 3: Aguarde a instalação. ' +
          'Passo 4: Retorne à página de Missões para concluir a missão.';
        VoiceNarrator.speak(text, 'Passo a passo da missão');
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        VoiceNarrator.stop();
      });
    }

    function refreshMissionState() {
      const completed = WalletService.isMissionCompleted(INSTALL_MISSION_ID);
      if (btnComplete) {
        if (completed) {
          btnComplete.disabled = true;
          btnComplete.textContent = '✔ MISSÃO CONCLUÍDA (+50 TR RECEBIDOS)';
          btnComplete.classList.remove('btn-gold');
          btnComplete.classList.add('btn-emerald');
        } else {
          btnComplete.disabled = false;
          btnComplete.textContent = '🎁 CONCLUIR MISSÃO E RECEBER +50 TR';
        }
      }
      if (statusBox) {
        if (completed) {
          const info = WalletService.loadState().completedMissions[INSTALL_MISSION_ID];
          statusBox.innerHTML =
            '<strong>Status:</strong> Recompensa de +50 TR já resgatada em ' +
            (info && info.completedAt ? info.completedAt : 'sessão anterior') +
            '. Proteção contra duplicidade ativa.';
        } else {
          statusBox.innerHTML =
            '<strong>Status:</strong> Disponível para conclusão manual (+50 TR demonstrativos).';
        }
      }
    }

    if (btnComplete) {
      btnComplete.addEventListener('click', () => {
        const result = WalletService.claimMissionReward(
          INSTALL_MISSION_ID,
          'Missão Especial: Instale o Aplicativo',
          'Recompensa demonstrativa pela instalação do aplicativo TERRAS RARAS.',
          INSTALL_MISSION_REWARD
        );

        showToast(result.message);
        syncWalletUI();
        refreshMissionState();
      });
    }

    refreshMissionState();
  }

  function initHistoryPage() {
    const listContainer = document.getElementById('history-list-container');
    if (!listContainer) return;

    const state = WalletService.loadState();
    if (!state.history || state.history.length === 0) {
      listContainer.innerHTML =
        '<p class="section-desc">Nenhuma movimentação registrada até o momento.</p>';
      return;
    }

    listContainer.innerHTML = state.history
      .map((item) => {
        return `
          <div class="history-item">
            <div>
              <div class="history-title">${escapeHtml(item.title)}</div>
              <div class="history-date">${escapeHtml(item.description)}</div>
              <div class="history-date">Data e horário: ${escapeHtml(item.timestamp)}</div>
            </div>
            <div class="history-amount">+${Number(item.amount).toLocaleString('pt-BR')} TR</div>
          </div>
        `;
      })
      .join('');
  }

  function initAchievementsPage() {
    const container = document.getElementById('achievements-container');
    if (!container) return;

    const state = WalletService.loadState();
    const installDone = Boolean(state.completedMissions[INSTALL_MISSION_ID]);
    const balance = state.balance;

    const achievements = [
      {
        title: 'Explorador Iniciante TR',
        description: 'Ativou sua carteira demonstrativa TERRAS RARAS com saldo inicial de 600 TR.',
        current: 1,
        target: 1,
        completed: true,
        badge: 'Concluída'
      },
      {
        title: 'Pioneiro Mobile PWA',
        description: 'Concluiu a Missão Especial de instalação do aplicativo TERRAS RARAS (+50 TR).',
        current: installDone ? 1 : 0,
        target: 1,
        completed: installDone,
        badge: installDone ? 'Concluída' : 'Em andamento'
      },
      {
        title: 'Reserva Estratégica 650 TR',
        description: 'Alcance o saldo demonstrativo acumulado de 650 TR na sua carteira.',
        current: Math.min(balance, 650),
        target: 650,
        completed: balance >= 650,
        badge: balance >= 650 ? 'Concluída' : `${Math.min(balance, 650)} / 650 TR`
      }
    ];

    container.innerHTML = achievements
      .map((ach) => {
        const pct = Math.min(100, Math.round((ach.current / ach.target) * 100));
        return `
          <article class="card ${ach.completed ? 'card-gold-highlight' : 'card-emerald'}">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
              <h3 class="section-title" style="margin-bottom:0;">🏆 ${escapeHtml(ach.title)}</h3>
              <span class="badge ${ach.completed ? 'badge-gold' : 'badge-emerald'}">${escapeHtml(ach.badge)}</span>
            </div>
            <p class="section-desc" style="margin-bottom:8px;">${escapeHtml(ach.description)}</p>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${pct}%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-secondary);">
              <span>Progresso</span>
              <strong>${pct}%</strong>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function initSettingsPage() {
    const voiceRateSelect = document.getElementById('voice-rate-select');
    const btnTestVoice = document.getElementById('btn-test-voice');
    const btnResetWallet = document.getElementById('btn-reset-wallet');
    const pwaStatusText = document.getElementById('pwa-status-text');

    const state = WalletService.loadState();

    if (voiceRateSelect) {
      voiceRateSelect.value = String(state.preferences.voiceRate || 1.0);
      voiceRateSelect.addEventListener('change', (e) => {
        const current = WalletService.loadState();
        current.preferences.voiceRate = parseFloat(e.target.value) || 1.0;
        WalletService.saveState(current);
        showToast('Velocidade da narração atualizada.');
      });
    }

    if (btnTestVoice) {
      btnTestVoice.addEventListener('click', () => {
        VoiceNarrator.speak(
          'Sistema de áudio TERRAS RARAS funcionando perfeitamente em português do Brasil.',
          'Teste de voz'
        );
      });
    }

    if (btnResetWallet) {
      btnResetWallet.addEventListener('click', () => {
        WalletService.resetDemoData();
        syncWalletUI();
        showToast('Dados demonstrativos restaurados para 600 TR.');
      });
    }

    if (pwaStatusText) {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      pwaStatusText.textContent = isStandalone
        ? 'Executando como Aplicativo Instalado (Standalone).'
        : 'Executando via Navegador Web (Pronto para instalação PWA).';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // 7. INICIALIZAÇÃO GLOBAL AO CARREGAR O DOM
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    // Garante inicialização do estado persistente e sincroniza saldo
    WalletService.loadState();
    syncWalletUI();

    // Vincula todos os botões de instalação PWA presentes na página atual
    document.querySelectorAll('[data-pwa-install-btn]').forEach((btn) => {
      btn.addEventListener('click', handleInstallClick);
    });

    // Inicializa controladores específicos conforme a página ativa
    const page = document.body.getAttribute('data-page');
    if (page === 'home') initHomePage();
    if (page === 'missao') initMissionPage();
    if (page === 'historico') initHistoryPage();
    if (page === 'conquistas') initAchievementsPage();
    if (page === 'configuracoes') initSettingsPage();
  });

  // Registra Service Worker
  registerServiceWorker();
})();
