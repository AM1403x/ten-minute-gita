/**
 * Talk to Krishna — Frontend Logic
 *
 * Firebase Auth (Google + Apple), chat with streaming,
 * Firestore conversation persistence, and UI interactions.
 * Follows the IIFE pattern from the existing tenminutegita.com site.
 */
(function() {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================
  var WORKER_BASE = 'https://talk-to-krishna.tenminutegita.workers.dev';
  var WORKER_URL = WORKER_BASE + '/chat';
  var TTS_URL = WORKER_BASE + '/tts';
  var MAX_CHARS = 2000;
  var MAX_MESSAGES_PER_CONVERSATION = 100;
  var SEND_COOLDOWN_MS = 1000;
  var MESSAGES_TO_SEND = 30; // last N messages sent to API

  // Firebase config (same web app as android.html)
  var firebaseConfig = {
    apiKey: 'AIzaSyBgVjaIHyqGfreUMPDlxXTtcJR8fhFAJ3k',
    authDomain: 'minute-gita.firebaseapp.com',
    projectId: 'minute-gita',
    storageBucket: 'minute-gita.firebasestorage.app',
    messagingSenderId: '874503441995',
    appId: '1:874503441995:web:e00930c4b6221c6c0647ce'
  };

  // ============================================================
  // STATE
  // ============================================================
  var currentUser = null;
  var currentConversationId = null;
  var messages = []; // { role: 'user'|'assistant', content: string, timestamp: number }
  var isStreaming = false;
  var abortController = null;
  var lastSendTime = 0;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Voice mode state
  var currentAudio = null;          // currently playing Audio object
  var currentSpeakerBtn = null;     // speaker button for the playing message
  var isRecording = false;          // mic is active
  var recognition = null;           // SpeechRecognition instance
  var voiceAutoPlay = false;        // global auto-play toggle
  var audioCache = new Map();       // text hash -> blob URL cache

  // ============================================================
  // FIREBASE INIT
  // ============================================================
  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

  // ============================================================
  // DOM REFERENCES (cached after DOMContentLoaded)
  // ============================================================
  var els = {};

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', function() {
    cacheElements();
    initAuth();
    initChatUI();
    initVoiceInput();
    initVoiceOutput();
    initDivineCursor();
    document.body.classList.add('loaded');
  });

  function cacheElements() {
    els.authOverlay = document.getElementById('authOverlay');
    els.chatApp = document.getElementById('chatApp');
    els.googleSignIn = document.getElementById('googleSignIn');
    els.authError = document.getElementById('authError');
    els.messagesContainer = document.getElementById('messagesContainer');
    els.messagesInner = document.getElementById('messagesInner');
    els.welcomeState = document.getElementById('welcomeState');
    els.loadingIndicator = document.getElementById('loadingIndicator');
    els.messageInput = document.getElementById('messageInput');
    els.sendBtn = document.getElementById('sendBtn');
    els.charCount = document.getElementById('charCount');
    els.scrollPill = document.getElementById('scrollPill');
    els.newChatBtn = document.getElementById('newChatBtn');
    els.historyBtn = document.getElementById('historyBtn');
    els.userAvatarBtn = document.getElementById('userAvatarBtn');
    els.userMenu = document.getElementById('userMenu');
    els.userDisplayName = document.getElementById('userDisplayName');
    els.userEmail = document.getElementById('userEmail');
    els.signOutBtn = document.getElementById('signOutBtn');
    els.historyOverlay = document.getElementById('historyOverlay');
    els.historyPanel = document.getElementById('historyPanel');
    els.historyList = document.getElementById('historyList');
    els.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    els.confirmOverlay = document.getElementById('confirmOverlay');
    els.confirmCancel = document.getElementById('confirmCancel');
    els.confirmNew = document.getElementById('confirmNew');
    els.toast = document.getElementById('toast');
    els.micBtn = document.getElementById('micBtn');
    els.voiceToggle = document.getElementById('voiceToggle');
    els.speedBtn = document.getElementById('speedBtn');
    els.speedLabel = els.speedBtn ? els.speedBtn.querySelector('.speed-label') : null;
    els.speedPopover = document.getElementById('speedPopover');
  }

  // ============================================================
  // AUTH
  // ============================================================
  function initAuth() {
    auth.onAuthStateChanged(function(user) {
      if (user) {
        currentUser = user;
        showChatApp();
        updateUserUI(user);
        loadMostRecentConversation();
      } else {
        currentUser = null;
        showAuthOverlay();
      }
    });

    els.googleSignIn.addEventListener('click', function() {
      els.authError.textContent = '';
      var provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider).catch(handleAuthError);
    });

    els.signOutBtn.addEventListener('click', function() {
      closeUserMenu();
      auth.signOut();
    });
  }

  function handleAuthError(error) {
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      return; // user cancelled
    }
    if (error.code === 'auth/popup-blocked') {
      els.authError.textContent = 'Popup was blocked. Please allow popups for this site.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      els.authError.textContent = 'An account already exists with this email using a different sign-in method.';
    } else {
      els.authError.textContent = 'Sign in failed. Please try again.';
    }
  }

  function showAuthOverlay() {
    els.authOverlay.classList.remove('hidden');
    els.chatApp.style.display = 'none';
    els.chatApp.classList.remove('visible');
  }

  function showChatApp() {
    els.authOverlay.classList.add('hidden');
    els.chatApp.style.display = 'flex';
    // Delay for smooth transition
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        els.chatApp.classList.add('visible');
      });
    });
  }

  function updateUserUI(user) {
    var name = user.displayName || 'User';
    var email = user.email || '';
    els.userDisplayName.textContent = name;
    els.userEmail.textContent = email;

    // Avatar: photo or initial
    if (user.photoURL) {
      els.userAvatarBtn.innerHTML = '<img src="' + escapeHtml(user.photoURL) + '" alt="' + escapeHtml(name.charAt(0)) + '">';
    } else {
      els.userAvatarBtn.textContent = name.charAt(0).toUpperCase();
    }
  }

  function getIdToken(forceRefresh) {
    if (!currentUser) return Promise.reject(new Error('Not authenticated'));
    return currentUser.getIdToken(!!forceRefresh);
  }

  // ============================================================
  // CHAT UI SETUP
  // ============================================================
  function initChatUI() {
    // Send message
    els.sendBtn.addEventListener('click', function() {
      sendMessage(els.messageInput.value);
    });

    // Textarea: Enter to send, Shift+Enter for newline
    els.messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(els.messageInput.value);
      }
    });

    // Textarea auto-resize
    els.messageInput.addEventListener('input', function() {
      autoResizeTextarea();
      updateSendButton();
      updateCharCount();
    });

    // Starter prompts
    var starters = document.querySelectorAll('.starter-btn');
    for (var i = 0; i < starters.length; i++) {
      starters[i].addEventListener('click', function() {
        sendMessage(this.textContent);
      });
    }

    // New chat
    els.newChatBtn.addEventListener('click', function() {
      if (messages.length === 0) return;
      showConfirmDialog();
    });

    // Confirm dialog
    els.confirmCancel.addEventListener('click', hideConfirmDialog);
    els.confirmNew.addEventListener('click', function() {
      hideConfirmDialog();
      startNewConversation();
    });

    // History panel
    els.historyBtn.addEventListener('click', openHistoryPanel);
    els.closeHistoryBtn.addEventListener('click', closeHistoryPanel);
    els.historyOverlay.addEventListener('click', closeHistoryPanel);

    // User menu
    els.userAvatarBtn.addEventListener('click', toggleUserMenu);

    // Close user menu on outside click
    document.addEventListener('click', function(e) {
      if (!els.userMenu.contains(e.target) && e.target !== els.userAvatarBtn && !els.userAvatarBtn.contains(e.target)) {
        closeUserMenu();
      }
    });

    // Scroll pill
    els.scrollPill.addEventListener('click', function() {
      scrollToBottom(true);
    });

    // Scroll tracking for pill visibility
    els.messagesContainer.addEventListener('scroll', function() {
      updateScrollPill();
    }, { passive: true });

    // Mobile keyboard handling
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function() {
        var offset = window.innerHeight - window.visualViewport.height;
        document.querySelector('.input-area').style.paddingBottom =
          'calc(' + Math.max(offset, 0) + 'px + 12px + env(safe-area-inset-bottom))';
      });
    }
  }

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  function sendMessage(text) {
    if (!text || !text.trim()) return;
    if (isStreaming) return;

    // Cooldown
    var now = Date.now();
    if (now - lastSendTime < SEND_COOLDOWN_MS) return;
    lastSendTime = now;

    var trimmed = text.trim().substring(0, MAX_CHARS);

    // Add user message
    var userMsg = { role: 'user', content: trimmed, timestamp: Date.now() };
    messages.push(userMsg);
    appendMessageToDOM(userMsg);
    clearInput();
    hideWelcomeState();
    showLoadingIndicator();
    scrollToBottom(true);

    isStreaming = true;
    updateSendButton();
    abortController = new AbortController();

    // Get token and call Worker
    getIdToken(false).then(function(token) {
      // Build messages to send (last N)
      var toSend = messages.slice(-MESSAGES_TO_SEND).map(function(m) {
        return { role: m.role, content: m.content };
      });

      return fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ messages: toSend }),
        signal: abortController.signal
      });
    }).then(function(response) {
      if (response.status === 401) {
        // Try refreshing token once
        return getIdToken(true).then(function(freshToken) {
          var toSend = messages.slice(-MESSAGES_TO_SEND).map(function(m) {
            return { role: m.role, content: m.content };
          });
          return fetch(WORKER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + freshToken
            },
            body: JSON.stringify({ messages: toSend }),
            signal: abortController.signal
          });
        });
      }
      return response;
    }).then(function(response) {
      if (!response.ok) {
        return response.json().then(function(err) {
          throw new Error(err.error || 'Something went wrong');
        });
      }
      return handleStreamingResponse(response);
    }).catch(function(error) {
      if (error.name === 'AbortError') return;
      hideLoadingIndicator();
      isStreaming = false;
      updateSendButton();

      if (error.message && error.message.indexOf('session') !== -1) {
        showToast('Your session has expired. Please sign in again.');
        auth.signOut();
      } else if (error.message && error.message.indexOf('breath') !== -1) {
        // Rate limit message from the worker
        showSystemMessage(error.message);
      } else {
        showSystemMessage('The connection was briefly lost. Please try again.');
      }
    });
  }

  // ============================================================
  // STREAMING RESPONSE
  // ============================================================
  function handleStreamingResponse(response) {
    // Keep loading indicator visible — it stays on until thinking ends

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var assistantMsg = { role: 'assistant', content: '', timestamp: Date.now() };
    var rawContent = ''; // all tokens including <think> blocks
    var isThinking = false; // currently inside a <think> block
    var thinkingDone = false; // </think> has been received
    var msgEl = null;
    var contentEl = null;
    var buffer = '';
    var eagerTTSFired = false; // whether we already pre-fetched TTS for chunk 0

    function read() {
      return reader.read().then(function(result) {
        if (result.done) {
          finishStreaming(assistantMsg, contentEl);
          return;
        }

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith('data: ')) {
            var data = line.slice(6);
            if (data === '[DONE]') {
              finishStreaming(assistantMsg, contentEl);
              return;
            }
            try {
              var parsed = JSON.parse(data);
              var choices = parsed.choices;
              if (choices && choices.length > 0) {
                var delta = choices[0].delta;
                if (delta && delta.content) {
                  rawContent += delta.content;

                  // Detect <think> opening
                  if (!isThinking && !thinkingDone && rawContent.indexOf('<think>') !== -1) {
                    isThinking = true;
                  }

                  // Detect </think> closing
                  if (isThinking && rawContent.indexOf('</think>') !== -1) {
                    isThinking = false;
                    thinkingDone = true;
                  }

                  // While thinking, keep the loading indicator and skip rendering
                  if (isThinking) continue;

                  // Extract visible content (everything after </think>, or all if no think tags)
                  var visibleContent = rawContent;
                  var thinkCloseIdx = visibleContent.indexOf('</think>');
                  if (thinkCloseIdx !== -1) {
                    visibleContent = visibleContent.substring(thinkCloseIdx + 8);
                  }
                  // Also strip any complete <think>...</think> that might appear mid-text
                  visibleContent = visibleContent.replace(/<think>[\s\S]*?<\/think>/gi, '');
                  visibleContent = visibleContent.trim();

                  if (!visibleContent) continue;

                  // Clean response (strip dashes, residual tags)
                  visibleContent = cleanResponse(visibleContent);
                  if (!visibleContent) continue;

                  // First visible token: hide loading, create message bubble
                  if (!msgEl) {
                    hideLoadingIndicator();
                    messages.push(assistantMsg);
                    msgEl = appendMessageToDOM(assistantMsg);
                    contentEl = msgEl.querySelector('.message-content');
                  }

                  assistantMsg.content = visibleContent;
                  contentEl.innerHTML = renderMarkdown(visibleContent);
                  scrollToBottom(false);

                  // Eager TTS: pre-fetch chunk 0 while still streaming.
                  // Uses splitTextForTTS so the cached audio matches
                  // what playKrishnaVoice will request after streaming.
                  if (!eagerTTSFired && voiceAutoPlay && visibleContent.length > 80) {
                    var eagerChunks = splitTextForTTS(visibleContent);
                    if (eagerChunks.length >= 1 && eagerChunks[0].length >= 40) {
                      eagerTTSFired = true;
                      var eagerChunk0 = eagerChunks[0];
                      getIdToken(false).then(function(token) {
                        return fetchChunkAudio(eagerChunk0, token);
                      }).catch(function() { /* non-critical */ });
                    }
                  }
                }
              }
            } catch (e) {
              // skip unparseable chunks
            }
          }
        }

        return read();
      }).catch(function(error) {
        if (error.name === 'AbortError') return;
        // Streaming interrupted, keep partial response
        finishStreaming(assistantMsg, contentEl);
      });
    }

    return read();
  }

  function finishStreaming(assistantMsg, contentEl) {
    hideLoadingIndicator();
    isStreaming = false;
    updateSendButton();

    // Run full post-processing pipeline on final response
    if (assistantMsg.content) {
      assistantMsg.content = processKrishnaResponse(assistantMsg.content);
    }

    // Final render with markdown
    if (assistantMsg.content && contentEl) {
      contentEl.innerHTML = renderMarkdown(assistantMsg.content);
    }

    // Trim conversation if too long
    if (messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      messages = messages.slice(-60);
    }

    // Save to Firestore
    saveConversation();
    scrollToBottom(false);

    // Auto-play voice if toggle is ON
    if (voiceAutoPlay && assistantMsg.content) {
      var msgEl = contentEl ? contentEl.closest('.message') : null;
      var speakerBtn = msgEl ? msgEl.querySelector('.message-speaker-btn') : null;
      if (speakerBtn) {
        playKrishnaVoice(assistantMsg.content, speakerBtn);
      }
    }
  }

  // ============================================================
  // MARKDOWN RENDERING
  // ============================================================

  /**
   * Strip <think>...</think> blocks that some models emit as
   * chain-of-thought reasoning. Handles both complete and
   * in-progress (unclosed) think tags during streaming.
   * Also strips <reasoning>, <thought>, and similar model-internal tags.
   */
  function stripThinkTags(text) {
    // Remove complete <think>...</think> blocks (including across newlines)
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // Remove complete <reasoning>...</reasoning> blocks
    text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    // Remove unclosed <think>... that is still streaming
    text = text.replace(/<think>[\s\S]*$/gi, '');
    // Remove unclosed <reasoning>... that is still streaming
    text = text.replace(/<reasoning>[\s\S]*$/gi, '');
    return text.trim();
  }

  /**
   * Clean response text: strip dashes, think tags, and other artifacts.
   * Applied as a safety net to all assistant messages (streaming + saved).
   */
  function cleanResponse(text) {
    if (!text) return text;
    // Strip think/reasoning tags
    text = stripThinkTags(text);
    // Replace em dashes and en dashes with comma-space
    // Unicode codepoints AND their literal multi-byte sequences
    text = text.replace(/\u2014/g, ', ');  // em dash —
    text = text.replace(/\u2013/g, ', ');  // en dash –
    text = text.replace(/\u{2014}/gu, ', ');
    text = text.replace(/\u{2013}/gu, ', ');
    return text;
  }

  /**
   * Trim trailing direct questions in the FINAL paragraph only.
   * Keeps only the LAST question mark in the final paragraph.
   * Rhetorical questions in earlier paragraphs are left untouched.
   */
  function trimTrailingQuestions(text) {
    if (!text) return text;

    // Split into paragraphs (double newline)
    var paragraphs = text.split(/\n\n+/);
    if (paragraphs.length === 0) return text;

    var lastPara = paragraphs[paragraphs.length - 1];

    // Split final paragraph on ?, keeping delimiter
    var sentences = lastPara.split(/(\?)/);

    // Count question marks in the final paragraph
    var qCount = 0;
    for (var i = 0; i < sentences.length; i++) {
      if (sentences[i] === '?') qCount++;
    }

    // If 0 or 1 question in last paragraph, nothing to do
    if (qCount <= 1) return text;

    // Rebuild: keep only the LAST "?" in the final paragraph
    var rebuilt = [];
    var keptQuestion = false;

    for (var j = sentences.length - 1; j >= 0; j--) {
      if (sentences[j] === '?') {
        if (!keptQuestion) {
          keptQuestion = true;
          rebuilt.unshift(sentences[j]);
        } else {
          rebuilt.unshift('.');
        }
      } else {
        rebuilt.unshift(sentences[j]);
      }
    }

    var newLastPara = rebuilt.join('').trim();
    // Clean up double periods
    newLastPara = newLastPara.replace(/\.\s*\./g, '.');

    paragraphs[paragraphs.length - 1] = newLastPara;
    return paragraphs.join('\n\n');
  }

  /**
   * Full post-processing pipeline for Krishna responses.
   * Applied after streaming completes and when loading from Firestore.
   * Order: stripThinkTags → cleanResponse → trimTrailingQuestions
   */
  function processKrishnaResponse(text) {
    if (!text) return text;
    text = cleanResponse(text);        // includes stripThinkTags + em/en dash
    text = trimTrailingQuestions(text); // keep ≤1 question in final paragraph
    return text;
  }

  function renderMarkdown(text) {
    // 0. Clean response (strips think tags + dashes)
    text = cleanResponse(text);

    // 1. HTML escape (prevent XSS)
    var escaped = escapeHtml(text);

    // 2. Bold: **text**
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 3. Italic: *text*
    escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 4. Line breaks
    escaped = escaped.replace(/\n/g, '<br>');

    // 5. Detect Devanagari shlokas (lines that are mostly Devanagari characters)
    escaped = escaped.replace(/<br>([\u0900-\u097F\s\|\.।॥,]+)<br>/g, function(match, shloka) {
      return '<br><span class="shloka">' + shloka + '</span><br>';
    });

    // Also detect shlokas at the start
    escaped = escaped.replace(/^([\u0900-\u097F\s\|\.।॥,]+)<br>/g, function(match, shloka) {
      return '<span class="shloka">' + shloka + '</span><br>';
    });

    return escaped;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ============================================================
  // DOM MANIPULATION
  // ============================================================
  function appendMessageToDOM(msg) {
    var div = document.createElement('div');
    div.className = 'message ' + (msg.role === 'assistant' ? 'krishna' : 'user');

    var html = '';
    if (msg.role === 'assistant') {
      html += '<div class="message-avatar">\u0950</div>';
    }
    html += '<div class="message-body">';
    html += '<div class="message-bubble">';
    html += '<div class="message-content">' + renderMarkdown(msg.content) + '</div>';
    html += '</div>';
    if (msg.role === 'assistant') {
      // Action row: speaker + copy (below bubble)
      html += '<div class="message-actions">';
      html += '<button class="message-speaker-btn" title="Listen">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
      html += '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>';
      html += '<path d="M15.54 8.46a5 5 0 010 7.07"></path>';
      html += '</svg>';
      html += '</button>';
      html += '<button class="message-copy" title="Copy">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
      html += '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>';
      html += '<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>';
      html += '</svg>';
      html += '<span class="copy-tooltip">Copied</span>';
      html += '</button>';
      html += '</div>';
    }
    html += '</div>';

    div.innerHTML = html;

    // Speaker handler
    var speakerBtn = div.querySelector('.message-speaker-btn');
    if (speakerBtn) {
      speakerBtn.addEventListener('click', function() {
        playKrishnaVoice(msg.content, speakerBtn);
      });
    }

    // Copy handler
    var copyBtn = div.querySelector('.message-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        var textContent = msg.content;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(textContent).then(function() {
            var tooltip = copyBtn.querySelector('.copy-tooltip');
            tooltip.classList.add('visible');
            setTimeout(function() { tooltip.classList.remove('visible'); }, 1500);
          }).catch(function() {});
        }
      });
    }

    els.messagesInner.appendChild(div);
    return div;
  }

  function renderAllMessages() {
    // Clear existing messages (keep welcome state but hide it)
    var children = els.messagesInner.children;
    var toRemove = [];
    for (var i = 0; i < children.length; i++) {
      if (children[i] !== els.welcomeState) {
        toRemove.push(children[i]);
      }
    }
    for (var j = 0; j < toRemove.length; j++) {
      toRemove[j].remove();
    }

    if (messages.length === 0) {
      showWelcomeState();
    } else {
      hideWelcomeState();
      for (var k = 0; k < messages.length; k++) {
        appendMessageToDOM(messages[k]);
      }
      scrollToBottom(true);
    }
  }

  function showWelcomeState() {
    if (els.welcomeState) els.welcomeState.style.display = '';
  }

  function hideWelcomeState() {
    if (els.welcomeState) els.welcomeState.style.display = 'none';
  }

  function showLoadingIndicator() {
    els.loadingIndicator.style.display = '';
    // Move it into the messages area
    els.messagesInner.appendChild(els.loadingIndicator);
    scrollToBottom(true);
  }

  function hideLoadingIndicator() {
    els.loadingIndicator.style.display = 'none';
  }

  function showSystemMessage(text) {
    var div = document.createElement('div');
    div.className = 'system-message';
    div.textContent = text;
    els.messagesInner.appendChild(div);
    scrollToBottom(false);
  }

  // ============================================================
  // INPUT CONTROLS
  // ============================================================
  function clearInput() {
    els.messageInput.value = '';
    autoResizeTextarea();
    updateSendButton();
    updateCharCount();
  }

  function autoResizeTextarea() {
    var ta = els.messageInput;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }

  function updateSendButton() {
    var hasText = els.messageInput.value.trim().length > 0;
    if (hasText && !isStreaming) {
      els.sendBtn.classList.add('active');
    } else {
      els.sendBtn.classList.remove('active');
    }
  }

  function updateCharCount() {
    var len = els.messageInput.value.length;
    if (len > 1800) {
      els.charCount.textContent = len + ' / ' + MAX_CHARS;
      els.charCount.classList.add('visible');
      els.charCount.classList.toggle('warning', len > 1950);
    } else {
      els.charCount.classList.remove('visible');
    }
  }

  // ============================================================
  // SCROLL
  // ============================================================
  function scrollToBottom(immediate) {
    var container = els.messagesContainer;
    if (immediate) {
      container.scrollTop = container.scrollHeight;
    } else {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }
  }

  function updateScrollPill() {
    // Don't show scroll pill when there are no messages (welcome state)
    if (messages.length === 0) {
      els.scrollPill.classList.remove('visible');
      return;
    }
    var container = els.messagesContainer;
    var distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 200) {
      els.scrollPill.classList.add('visible');
    } else {
      els.scrollPill.classList.remove('visible');
    }
  }

  // ============================================================
  // FIRESTORE OPERATIONS
  // ============================================================
  function getConversationsRef() {
    if (!currentUser) return null;
    return db.collection('krishnaChat').doc(currentUser.uid).collection('conversations');
  }

  function saveConversation() {
    var ref = getConversationsRef();
    if (!ref || messages.length === 0) return;

    var docRef;
    if (currentConversationId) {
      docRef = ref.doc(currentConversationId);
    } else {
      docRef = ref.doc();
      currentConversationId = docRef.id;
    }

    // Title from first user message
    var title = '';
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') {
        title = messages[i].content.substring(0, 50);
        break;
      }
    }

    // Prepare messages for storage (strip large content if needed)
    var storedMessages = messages.map(function(m) {
      return { role: m.role, content: m.content, timestamp: m.timestamp };
    });

    docRef.set({
      title: title,
      messages: storedMessages,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function(err) {
      console.error('Failed to save conversation:', err);
    });
  }

  function loadMostRecentConversation() {
    var ref = getConversationsRef();
    if (!ref) return;

    // Show loading
    showLoadingScreen();

    ref.orderBy('updatedAt', 'desc').limit(1).get().then(function(snapshot) {
      hideLoadingScreen();
      if (!snapshot.empty) {
        var doc = snapshot.docs[0];
        var data = doc.data();
        currentConversationId = doc.id;
        messages = (data.messages || []).map(function(m) {
          if (m.role === 'assistant') m.content = processKrishnaResponse(m.content);
          return m;
        });
        renderAllMessages();
      } else {
        messages = [];
        currentConversationId = null;
        showWelcomeState();
      }
    }).catch(function(err) {
      hideLoadingScreen();
      console.error('Failed to load conversation:', err);
      showWelcomeState();
    });
  }

  function loadConversation(conversationId) {
    var ref = getConversationsRef();
    if (!ref) return;

    ref.doc(conversationId).get().then(function(doc) {
      if (doc.exists) {
        var data = doc.data();
        currentConversationId = conversationId;
        messages = (data.messages || []).map(function(m) {
          if (m.role === 'assistant') m.content = processKrishnaResponse(m.content);
          return m;
        });
        renderAllMessages();
        closeHistoryPanel();
      }
    }).catch(function(err) {
      showToast('Could not load conversation. Please try again.');
    });
  }

  function loadConversationList() {
    var ref = getConversationsRef();
    if (!ref) return;

    ref.orderBy('updatedAt', 'desc').limit(20).get().then(function(snapshot) {
      els.historyList.innerHTML = '';

      if (snapshot.empty) {
        els.historyList.innerHTML = '<div class="history-empty">No conversations yet.</div>';
        return;
      }

      snapshot.forEach(function(doc) {
        var data = doc.data();
        var item = document.createElement('div');
        item.className = 'history-item';
        if (doc.id === currentConversationId) {
          item.className += ' active';
        }

        var title = data.title || 'Untitled conversation';
        var date = data.updatedAt ? formatDate(data.updatedAt.toDate()) : '';

        item.innerHTML =
          '<button class="history-item-delete" title="Delete">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">' +
              '<polyline points="3 6 5 6 21 6"></polyline>' +
              '<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>' +
            '</svg>' +
          '</button>' +
          '<div class="history-item-title">' + escapeHtml(title) + '</div>' +
          '<div class="history-item-date">' + escapeHtml(date) + '</div>';

        // Click to load
        item.addEventListener('click', function(e) {
          if (e.target.closest('.history-item-delete')) return;
          loadConversation(doc.id);
        });

        // Delete button
        var deleteBtn = item.querySelector('.history-item-delete');
        deleteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          deleteConversation(doc.id);
        });

        els.historyList.appendChild(item);
      });
    }).catch(function(err) {
      els.historyList.innerHTML = '<div class="history-empty">Could not load conversations.</div>';
    });
  }

  function deleteConversation(conversationId) {
    var ref = getConversationsRef();
    if (!ref) return;

    ref.doc(conversationId).delete().then(function() {
      if (currentConversationId === conversationId) {
        startNewConversation();
      }
      loadConversationList();
    }).catch(function(err) {
      showToast('Could not delete conversation.');
    });
  }

  function startNewConversation() {
    // Save current before starting new
    if (messages.length > 0 && currentConversationId) {
      saveConversation();
    }
    currentConversationId = null;
    messages = [];
    renderAllMessages();
    showWelcomeState();
    els.scrollPill.classList.remove('visible');
    els.messageInput.focus();
  }

  function formatDate(date) {
    if (!date) return '';
    var now = new Date();
    var diff = now - date;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + ' days ago';

    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()] + ' ' + date.getDate();
  }

  // ============================================================
  // LOADING SCREEN
  // ============================================================
  function showLoadingScreen() {
    hideWelcomeState();
    // Clear messages area and show loading
    var children = els.messagesInner.children;
    var toRemove = [];
    for (var i = 0; i < children.length; i++) {
      if (children[i] !== els.welcomeState) toRemove.push(children[i]);
    }
    for (var j = 0; j < toRemove.length; j++) toRemove[j].remove();

    var loading = document.createElement('div');
    loading.className = 'loading-screen';
    loading.id = 'loadingScreen';
    loading.innerHTML = '<div class="loading-screen-om">\u0950</div><div class="loading-screen-text">Loading your conversation...</div>';
    els.messagesInner.appendChild(loading);
  }

  function hideLoadingScreen() {
    var el = document.getElementById('loadingScreen');
    if (el) el.remove();
  }

  // ============================================================
  // PANELS & DIALOGS
  // ============================================================
  function openHistoryPanel() {
    loadConversationList();
    els.historyOverlay.classList.add('visible');
    els.historyPanel.classList.add('visible');
  }

  function closeHistoryPanel() {
    els.historyOverlay.classList.remove('visible');
    els.historyPanel.classList.remove('visible');
  }

  function toggleUserMenu() {
    els.userMenu.classList.toggle('visible');
  }

  function closeUserMenu() {
    els.userMenu.classList.remove('visible');
  }

  function showConfirmDialog() {
    els.confirmOverlay.classList.add('visible');
  }

  function hideConfirmDialog() {
    els.confirmOverlay.classList.remove('visible');
  }

  // ============================================================
  // TOAST
  // ============================================================
  var toastTimer = null;

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      els.toast.classList.remove('visible');
    }, 4000);
  }

  // ============================================================
  // VOICE INPUT (Web Speech API)
  // ============================================================
  function initVoiceInput() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Unsupported browser — keep mic button hidden
      return;
    }

    // Show mic button
    els.micBtn.style.display = '';

    recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = function(event) {
      var transcript = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      els.messageInput.value = transcript;
      autoResizeTextarea();
      updateSendButton();
    };

    recognition.onend = function() {
      isRecording = false;
      els.micBtn.classList.remove('recording');
      els.messageInput.placeholder = 'Share what\'s on your mind...';
    };

    recognition.onerror = function(event) {
      isRecording = false;
      els.micBtn.classList.remove('recording');
      els.messageInput.placeholder = 'Share what\'s on your mind...';
      if (event.error === 'not-allowed') {
        showToast('Please allow microphone access to use voice input.');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        showToast('Voice input encountered an error. Please try again.');
      }
    };

    els.micBtn.addEventListener('click', function() {
      if (isRecording) {
        recognition.stop();
      } else {
        // Stop any playing audio first
        stopCurrentAudio();
        isRecording = true;
        els.micBtn.classList.add('recording');
        els.messageInput.placeholder = 'Listening...';
        try {
          recognition.start();
        } catch (e) {
          // Already started
          isRecording = false;
          els.micBtn.classList.remove('recording');
          els.messageInput.placeholder = 'Share what\'s on your mind...';
        }
      }
    });
  }

  // ============================================================
  // VOICE OUTPUT (Sarvam AI TTS)
  // ============================================================
  function initVoiceOutput() {
    // Load auto-play preference from localStorage (default ON for first-time users)
    try {
      var stored = localStorage.getItem('krishna_voice_autoplay');
      voiceAutoPlay = stored === null ? true : stored === 'true';
    } catch (e) { voiceAutoPlay = true; }

    if (voiceAutoPlay) {
      els.voiceToggle.classList.add('active');
    }

    // Toggle auto-play
    els.voiceToggle.addEventListener('click', function() {
      voiceAutoPlay = !voiceAutoPlay;
      els.voiceToggle.classList.toggle('active', voiceAutoPlay);
      try {
        localStorage.setItem('krishna_voice_autoplay', voiceAutoPlay ? 'true' : 'false');
      } catch (e) { /* ignore */ }
      showToast(voiceAutoPlay ? 'Krishna\'s voice will auto-play' : 'Auto-play turned off');
    });

    // Speed control — preset buttons
    try {
      var savedSpeed = parseFloat(localStorage.getItem('krishna_voice_speed'));
      if (savedSpeed && savedSpeed >= 0.5 && savedSpeed <= 2.0) audioSpeed = savedSpeed;
    } catch (e) { /* ignore */ }
    updateSpeedLabel();
    updateSpeedPresetActive();

    // Toggle popover on button click
    els.speedBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      els.speedPopover.classList.toggle('visible');
    });

    // Preset button clicks
    var presetBtns = els.speedPopover.querySelectorAll('.speed-preset');
    presetBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        audioSpeed = parseFloat(this.getAttribute('data-speed'));
        updateSpeedLabel();
        updateSpeedPresetActive();
        try { localStorage.setItem('krishna_voice_speed', audioSpeed.toString()); } catch (e) { /* ignore */ }
        if (currentAudio && !currentAudio.paused) {
          currentAudio.playbackRate = audioSpeed;
        }
        els.speedPopover.classList.remove('visible');
      });
    });

    // Close popover on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.speed-control-wrapper')) {
        els.speedPopover.classList.remove('visible');
      }
    });
  }

  function formatSpeed(speed) {
    // Show clean labels: 1x not 1.0x, 1.5x not 1.5x, 0.75x etc
    if (speed === Math.floor(speed)) return speed + 'x';
    return speed + 'x';
  }

  function updateSpeedLabel() {
    if (els.speedLabel) {
      els.speedLabel.textContent = formatSpeed(audioSpeed);
      els.speedBtn.classList.toggle('active', Math.abs(audioSpeed - 1.0) > 0.05);
    }
  }

  function updateSpeedPresetActive() {
    if (!els.speedPopover) return;
    var presets = els.speedPopover.querySelectorAll('.speed-preset');
    presets.forEach(function(btn) {
      var val = parseFloat(btn.getAttribute('data-speed'));
      btn.classList.toggle('active', Math.abs(val - audioSpeed) < 0.01);
    });
  }

  /**
   * Simple hash for caching audio by text content.
   */
  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash; // 32-bit integer
    }
    return 'tts_' + Math.abs(hash);
  }

  /**
   * Stop currently playing audio.
   */
  function stopCurrentAudio() {
    playbackSessionId++; // cancel any pending chunk chain
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if (currentSpeakerBtn) {
      currentSpeakerBtn.classList.remove('playing', 'loading');
      currentSpeakerBtn = null;
    }
  }

  // Playback session counter — incremented on every new play/stop to cancel stale chains
  var playbackSessionId = 0;
  var audioSpeed = 1.0; // current playback speed

  /**
   * Split text into TTS-friendly chunks on sentence/paragraph boundaries.
   * Target ~500 chars per chunk (well within Sarvam v3's 2500 char limit).
   */
  /**
   * Split text into TTS chunks. First chunk is small (~300 chars)
   * for fast first-audio, remaining chunks are ~600 chars.
   */
  function splitTextForTTS(text) {
    var cleaned = text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .trim();

    if (cleaned.length <= 350) return [cleaned];

    // Split into sentences first
    var sentences = cleaned.match(/[^.!?।]+[.!?।]+[\s]*/g);
    if (!sentences) return [cleaned];

    var chunks = [];
    var current = '';
    var isFirstChunk = true;

    for (var i = 0; i < sentences.length; i++) {
      var sent = sentences[i];
      var limit = isFirstChunk ? 300 : 600;

      if (current.length + sent.length <= limit) {
        current += sent;
      } else {
        if (current) {
          chunks.push(current.trim());
          isFirstChunk = false;
        }
        current = sent;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [cleaned];
  }

  /**
   * Fetch TTS audio for a single text chunk. Returns blob URL.
   * Uses cache if available.
   */
  function fetchChunkAudio(chunkText, token) {
    var cacheKey = simpleHash(chunkText);
    if (audioCache.has(cacheKey)) {
      return Promise.resolve(audioCache.get(cacheKey));
    }

    return fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ text: chunkText })
    }).then(function(response) {
      if (!response.ok) {
        return response.json().then(function(err) {
          throw new Error(err.error || 'TTS failed');
        }).catch(function(parseErr) {
          if (parseErr.message && parseErr.message !== 'TTS failed') throw parseErr;
          throw new Error('TTS failed (' + response.status + ')');
        });
      }
      return response.blob();
    }).then(function(blob) {
      var url = URL.createObjectURL(blob);
      audioCache.set(cacheKey, url);
      return url;
    });
  }

  /**
   * Play Krishna's voice for a message using chunked TTS.
   * Splits long text, fetches chunks in parallel, plays sequentially.
   * First chunk starts playing as soon as it arrives.
   * If eagerPromise is provided (pre-fetched during streaming), it's
   * used as a head start — its audio is pre-cached via audioCache.
   */
  function playKrishnaVoice(messageText, speakerBtn) {
    if (!messageText || !speakerBtn) return;

    // If this message is already playing, toggle off
    if (currentSpeakerBtn === speakerBtn && currentAudio && !currentAudio.paused) {
      stopCurrentAudio();
      return;
    }

    // Stop any existing playback
    stopCurrentAudio();

    var sessionId = ++playbackSessionId;
    speakerBtn.classList.add('loading');
    currentSpeakerBtn = speakerBtn;

    var chunks = splitTextForTTS(messageText);

    getIdToken(false).then(function(token) {
      // Fire all chunk requests in parallel
      var chunkPromises = chunks.map(function(chunk) {
        return fetchChunkAudio(chunk, token);
      });

      // As soon as chunk 0 arrives, start playing
      chunkPromises[0].then(function(firstUrl) {
        if (playbackSessionId !== sessionId) return;
        speakerBtn.classList.remove('loading');
        playChunkSequence(chunkPromises, 0, speakerBtn, sessionId);
      }).catch(function(err) {
        // If first chunk fails, try token refresh
        return getIdToken(true).then(function(freshToken) {
          chunkPromises = chunks.map(function(chunk) {
            return fetchChunkAudio(chunk, freshToken);
          });
          return chunkPromises[0];
        }).then(function(firstUrl) {
          if (playbackSessionId !== sessionId) return;
          speakerBtn.classList.remove('loading');
          playChunkSequence(chunkPromises, 0, speakerBtn, sessionId);
        });
      }).catch(function(err) {
        if (playbackSessionId !== sessionId) return;
        speakerBtn.classList.remove('loading');
        currentSpeakerBtn = null;
        showToast('Could not play audio. Please try again.');
      });
    }).catch(function(err) {
      speakerBtn.classList.remove('loading');
      currentSpeakerBtn = null;
      showToast('Could not play audio. Please try again.');
    });
  }

  /**
   * Play chunk at index, then chain to next chunk when it ends.
   */
  function playChunkSequence(chunkPromises, index, speakerBtn, sessionId) {
    if (playbackSessionId !== sessionId) return;
    if (index >= chunkPromises.length) {
      // All chunks finished
      speakerBtn.classList.remove('playing');
      if (currentSpeakerBtn === speakerBtn) {
        currentAudio = null;
        currentSpeakerBtn = null;
      }
      return;
    }

    chunkPromises[index].then(function(audioUrl) {
      if (playbackSessionId !== sessionId) return;

      var audio = new Audio(audioUrl);
      audio.playbackRate = audioSpeed;
      currentAudio = audio;
      currentSpeakerBtn = speakerBtn;
      speakerBtn.classList.add('playing');

      audio.onended = function() {
        if (playbackSessionId !== sessionId) return;
        // Chain to next chunk
        playChunkSequence(chunkPromises, index + 1, speakerBtn, sessionId);
      };

      audio.onerror = function() {
        // Skip failed chunk, try next
        if (playbackSessionId !== sessionId) return;
        playChunkSequence(chunkPromises, index + 1, speakerBtn, sessionId);
      };

      audio.play().catch(function() {
        speakerBtn.classList.remove('playing');
        currentAudio = null;
        currentSpeakerBtn = null;
      });
    }).catch(function() {
      // Skip failed chunk, try next
      if (playbackSessionId !== sessionId) return;
      playChunkSequence(chunkPromises, index + 1, speakerBtn, sessionId);
    });
  }

  // ============================================================
  // DIVINE CURSOR SYSTEM (from index.html)
  // ============================================================
  function initDivineCursor() {
    if (prefersReducedMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    var feather = document.createElement('div');
    feather.id = 'feather-cursor';
    feather.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">'
      + '<path d="M10 3 C13 14, 16 26, 22 44" stroke="#8B6914" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      + '<path d="M10 3 C13 14, 16 26, 22 44" stroke="#5c4318" stroke-width="0.7" fill="none" stroke-linecap="round" opacity="0.5"/>'
      + '<path d="M12 12 C7 10, 5 13, 7 16" stroke="#3d7a5a" stroke-width="0.8" fill="none" opacity="0.35"/>'
      + '<path d="M13 18 C8 16, 5 19, 8 22" stroke="#3d7a5a" stroke-width="0.8" fill="none" opacity="0.3"/>'
      + '<path d="M15 24 C10 22, 7 25, 10 28" stroke="#3d7a5a" stroke-width="0.7" fill="none" opacity="0.25"/>'
      + '<path d="M12 12 C17 10, 20 13, 18 16" stroke="#3d7a5a" stroke-width="0.8" fill="none" opacity="0.35"/>'
      + '<path d="M13 18 C18 16, 21 19, 18 22" stroke="#3d7a5a" stroke-width="0.8" fill="none" opacity="0.3"/>'
      + '<path d="M15 24 C20 22, 23 25, 20 28" stroke="#3d7a5a" stroke-width="0.7" fill="none" opacity="0.25"/>'
      + '<ellipse cx="14" cy="17" rx="7" ry="8.5" fill="#1a6b5a" opacity="0.75"/>'
      + '<ellipse cx="14" cy="17" rx="4.5" ry="5.5" fill="#2a4494" opacity="0.85"/>'
      + '<ellipse cx="14" cy="17" rx="2.2" ry="2.8" fill="#e8a54b"/>'
      + '<ellipse cx="14" cy="16.5" rx="1" ry="1.2" fill="#fff3e0" opacity="0.7"/>'
      + '</svg>';
    feather.style.cssText = 'position:fixed;width:48px;height:48px;pointer-events:none;z-index:100001;top:0;left:0;will-change:transform;filter:drop-shadow(0 0 3px rgba(232,165,75,0.15));transition:filter 0.2s;';
    document.body.appendChild(feather);

    var isHovering = false;
    var mouseX = -200, mouseY = -200;

    document.addEventListener('mouseover', function(e) {
      var t = e.target;
      if (t.matches && (t.matches('a, button, input, textarea, [role="button"]') || t.closest('a, button, [role="button"]'))) {
        isHovering = true;
        feather.style.filter = 'drop-shadow(0 0 8px rgba(232,165,75,0.5)) drop-shadow(0 0 16px rgba(232,165,75,0.25))';
      }
    }, { passive: true });

    document.addEventListener('mouseout', function(e) {
      var t = e.target;
      if (t.matches && (t.matches('a, button, input, textarea, [role="button"]') || t.closest('a, button, [role="button"]'))) {
        isHovering = false;
        feather.style.filter = 'drop-shadow(0 0 3px rgba(232,165,75,0.15))';
      }
    }, { passive: true });

    var container = document.createElement('div');
    container.id = 'sparkle-container';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100000;overflow:hidden;contain:layout style paint;';
    document.body.appendChild(container);

    var aura = document.createElement('div');
    aura.id = 'cursor-glow-aura';
    aura.style.cssText = 'position:fixed;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(232,165,75,0.06) 0%,rgba(232,165,75,0.02) 40%,transparent 70%);pointer-events:none;z-index:99998;transform:translate(-50%,-50%);will-change:transform;';
    document.body.appendChild(aura);

    var featherX = -200, featherY = -200;
    var glowX = -200, glowY = -200;
    var lastSpawn = 0;
    var trailCount = 0;
    var burstCount = 0;
    var MAX_TRAIL = 50;
    var MAX_BURST = 15;
    var THROTTLE = 40;

    var trailPalette = ['#e8a54b', '#f0c078', '#f5d590', '#c4863a', '#FFD700'];
    var starPalette = ['#f5d590', '#FFD700', '#f0c078'];
    var starClip = 'polygon(50% 0%, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0% 50%, 39% 35%)';

    function r(a, b) { return Math.random() * (b - a) + a; }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function spawn(x, y, isStar, isBurst) {
      var el = document.createElement('div');
      var size, color, dur, driftX, driftY;

      if (isStar) {
        size = isBurst ? r(8, 12) : r(8, 10);
        color = pick(starPalette);
        dur = isBurst ? r(700, 1100) : r(700, 1100);
      } else {
        size = isBurst ? r(5, 10) : r(3, 6);
        color = pick(trailPalette);
        dur = isBurst ? r(600, 1000) : r(500, 900);
      }

      var ox = isBurst ? 0 : r(-8, 8);
      var oy = isBurst ? 0 : r(-8, 8);
      var op = isBurst ? 1.0 : r(0.6, 1.0);

      if (isBurst) {
        var angle = r(0, Math.PI * 2);
        var dist = r(30, 60);
        driftX = Math.cos(angle) * dist;
        driftY = Math.sin(angle) * dist;
      } else {
        driftX = r(-20, 20);
        driftY = r(-20, 20);
      }

      el.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;border-radius:' + (isStar ? '0' : '50%') + ';background:' + color + ';left:' + (x + ox) + 'px;top:' + (y + oy) + 'px;pointer-events:none;';
      if (isStar) el.style.clipPath = starClip;

      container.appendChild(el);
      if (isBurst) burstCount++; else trailCount++;

      var anim = el.animate([
        { transform: 'translate(0,0) scale(1)', opacity: op },
        { transform: 'translate(' + driftX + 'px,' + driftY + 'px) scale(0)', opacity: 0 }
      ], { duration: dur, easing: 'ease-out', fill: 'forwards' });

      anim.onfinish = function() {
        el.remove();
        if (isBurst) burstCount--; else trailCount--;
      };
    }

    document.addEventListener('mousemove', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      var now = performance.now();
      if (now - lastSpawn < THROTTLE || trailCount >= MAX_TRAIL) return;
      lastSpawn = now;
      spawn(mouseX, mouseY, Math.random() < 0.28, false);
    }, { passive: true });

    document.addEventListener('click', function(e) {
      var n = Math.floor(r(12, 16));
      for (var i = 0; i < n; i++) {
        if (burstCount >= MAX_BURST) break;
        spawn(e.clientX, e.clientY, Math.random() < 0.35, true);
      }
    });

    (function loop() {
      featherX += (mouseX - featherX) * 0.45;
      featherY += (mouseY - featherY) * 0.45;
      var s = isHovering ? ' scale(1.12)' : '';
      feather.style.transform = 'translate(' + (featherX - 10) + 'px,' + (featherY - 3) + 'px)' + s;

      glowX += (mouseX - glowX) * 0.1;
      glowY += (mouseY - glowY) * 0.1;
      aura.style.left = glowX + 'px';
      aura.style.top = glowY + 'px';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseleave', function() {
      feather.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function() {
      feather.style.opacity = '1';
    });
  }

})();
