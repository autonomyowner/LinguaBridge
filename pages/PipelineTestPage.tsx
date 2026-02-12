import React, { useState, useRef, useCallback } from 'react';
import { Room, ConnectionState } from 'livekit-client';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SUPPORTED_LANGUAGES, DEEPGRAM_LANGUAGE_MAP } from '../types';
import { float32ToInt16Buffer } from '../audioUtils';
import Header from '../components/Header';
import { useAuth } from '../providers/AuthContext';

type TestStatus = 'idle' | 'running' | 'pass' | 'fail';

interface TestResult {
  status: TestStatus;
  message: string;
  duration?: number;
  details?: string;
}

const DEFAULT_RESULT: TestResult = { status: 'idle', message: 'Not tested' };

const PipelineTestPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // API key actions
  const getDeepgramApiKey = useAction(api.rooms.actions.getDeepgramApiKey);
  const getOpenRouterApiKey = useAction(api.rooms.actions.getOpenRouterApiKey);
  const getGeminiApiKey = useAction(api.rooms.actions.getGeminiApiKey);
  const getCartesiaApiKey = useAction(api.voices.actions.getCartesiaApiKey);
  const getDefaultCartesiaVoiceId = useAction(api.voices.actions.getDefaultCartesiaVoiceId);

  // Test results
  const [micTest, setMicTest] = useState<TestResult>(DEFAULT_RESULT);
  const [deepgramKeyTest, setDeepgramKeyTest] = useState<TestResult>(DEFAULT_RESULT);
  const [deepgramWsTest, setDeepgramWsTest] = useState<TestResult>(DEFAULT_RESULT);
  const [openRouterKeyTest, setOpenRouterKeyTest] = useState<TestResult>(DEFAULT_RESULT);
  const [openRouterTranslateTest, setOpenRouterTranslateTest] = useState<TestResult>(DEFAULT_RESULT);
  const [cartesiaKeyTest, setCartesiaKeyTest] = useState<TestResult>(DEFAULT_RESULT);
  const [cartesiaVoiceTest, setCartesiaVoiceTest] = useState<TestResult>(DEFAULT_RESULT);
  const [cartesiaWsTest, setCartesiaWsTest] = useState<TestResult>(DEFAULT_RESULT);
  const [livekitTest, setLivekitTest] = useState<TestResult>(DEFAULT_RESULT);
  const [geminiKeyTest, setGeminiKeyTest] = useState<TestResult>(DEFAULT_RESULT);
  const [geminiSessionTest, setGeminiSessionTest] = useState<TestResult>(DEFAULT_RESULT);
  const [fullPipelineTest, setFullPipelineTest] = useState<TestResult>(DEFAULT_RESULT);

  // Refs for cleanup
  const cleanupRefs = useRef<(() => void)[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const userEmail = user?.email || undefined;

  const cleanup = useCallback(() => {
    cleanupRefs.current.forEach(fn => { try { fn(); } catch (_) {} });
    cleanupRefs.current = [];
  }, []);

  // --- Individual tests ---

  const testMicrophone = useCallback(async (): Promise<TestResult> => {
    setMicTest({ status: 'running', message: 'Requesting microphone...' });
    const start = Date.now();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      if (tracks.length === 0) {
        const result: TestResult = { status: 'fail', message: 'No audio tracks found', duration: Date.now() - start };
        setMicTest(result);
        return result;
      }
      const track = tracks[0];
      const settings = track.getSettings();
      const details = `Track: ${track.label}, Rate: ${settings.sampleRate || 'N/A'}Hz, Channels: ${settings.channelCount || 'N/A'}`;

      // Test AudioContext creation + resume
      const ctx = new AudioContext({ sampleRate: 16000 });
      await ctx.resume();
      const state = ctx.state;
      ctx.close();

      stream.getTracks().forEach(t => t.stop());
      const result: TestResult = { status: 'pass', message: `Mic OK, AudioContext: ${state}`, duration: Date.now() - start, details };
      setMicTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setMicTest(result);
      return result;
    }
  }, []);

  const testDeepgramKey = useCallback(async (): Promise<TestResult> => {
    setDeepgramKeyTest({ status: 'running', message: 'Fetching Deepgram API key...' });
    const start = Date.now();
    try {
      const { apiKey } = await getDeepgramApiKey({ userEmail });
      if (!apiKey) throw new Error('Empty API key returned');
      const masked = apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
      const result: TestResult = { status: 'pass', message: `Key: ${masked}`, duration: Date.now() - start };
      setDeepgramKeyTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setDeepgramKeyTest(result);
      return result;
    }
  }, [getDeepgramApiKey, userEmail]);

  const testDeepgramWebSocket = useCallback(async (): Promise<TestResult> => {
    setDeepgramWsTest({ status: 'running', message: 'Connecting to Deepgram WebSocket...' });
    const start = Date.now();
    try {
      const { apiKey } = await getDeepgramApiKey({ userEmail });
      const dgUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&punctuate=true&endpointing=300&utterance_end_ms=1000`;

      const result = await new Promise<TestResult>((resolve) => {
        const ws = new WebSocket(dgUrl, ['token', apiKey]);
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ status: 'fail', message: 'Connection timeout (5s)', duration: Date.now() - start });
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          // Send a tiny PCM buffer to verify the connection accepts data
          const testBuffer = new Int16Array(160).buffer; // 10ms of silence
          ws.send(testBuffer);
          setTimeout(() => {
            ws.close();
            resolve({ status: 'pass', message: 'WebSocket connected + accepted data', duration: Date.now() - start });
          }, 500);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({ status: 'fail', message: 'WebSocket connection failed', duration: Date.now() - start });
        };

        ws.onclose = (e) => {
          clearTimeout(timeout);
          if (e.code === 1006) {
            resolve({ status: 'fail', message: `Auth rejected (1006). Check API key and billing.`, duration: Date.now() - start });
          }
        };
      });

      setDeepgramWsTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setDeepgramWsTest(result);
      return result;
    }
  }, [getDeepgramApiKey, userEmail]);

  const testOpenRouterKey = useCallback(async (): Promise<TestResult> => {
    setOpenRouterKeyTest({ status: 'running', message: 'Fetching OpenRouter API key...' });
    const start = Date.now();
    try {
      const { apiKey } = await getOpenRouterApiKey({ userEmail });
      if (!apiKey) throw new Error('Empty API key returned');
      const masked = apiKey.slice(0, 10) + '...' + apiKey.slice(-4);
      const result: TestResult = { status: 'pass', message: `Key: ${masked}`, duration: Date.now() - start };
      setOpenRouterKeyTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setOpenRouterKeyTest(result);
      return result;
    }
  }, [getOpenRouterApiKey, userEmail]);

  const testOpenRouterTranslation = useCallback(async (): Promise<TestResult> => {
    setOpenRouterTranslateTest({ status: 'running', message: 'Testing translation (en->es)...' });
    const start = Date.now();
    try {
      const { apiKey } = await getOpenRouterApiKey({ userEmail });
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Translate from English to Spanish. Output ONLY the translated text.' },
            { role: 'user', content: 'Hello, how are you?' },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const translation = data.choices?.[0]?.message?.content?.trim();
      if (!translation) throw new Error('No translation returned');

      const result: TestResult = {
        status: 'pass',
        message: `"Hello, how are you?" -> "${translation}"`,
        duration: Date.now() - start,
        details: `Model: ${data.model || 'openai/gpt-4o-mini'}, Tokens: ${data.usage?.total_tokens || 'N/A'}`,
      };
      setOpenRouterTranslateTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setOpenRouterTranslateTest(result);
      return result;
    }
  }, [getOpenRouterApiKey, userEmail]);

  const testCartesiaKey = useCallback(async (): Promise<TestResult> => {
    setCartesiaKeyTest({ status: 'running', message: 'Fetching Cartesia API key...' });
    const start = Date.now();
    try {
      const { apiKey } = await getCartesiaApiKey({ userEmail });
      if (!apiKey) throw new Error('Empty API key returned');
      const masked = apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
      const result: TestResult = { status: 'pass', message: `Key: ${masked}`, duration: Date.now() - start };
      setCartesiaKeyTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setCartesiaKeyTest(result);
      return result;
    }
  }, [getCartesiaApiKey, userEmail]);

  const testCartesiaVoice = useCallback(async (): Promise<TestResult> => {
    setCartesiaVoiceTest({ status: 'running', message: 'Checking voice availability...' });
    const start = Date.now();
    try {
      const { voiceId } = await getDefaultCartesiaVoiceId({ userEmail });
      if (!voiceId) throw new Error('No voice ID available');
      const result: TestResult = { status: 'pass', message: `Voice ID: ${voiceId.slice(0, 8)}...`, duration: Date.now() - start };
      setCartesiaVoiceTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setCartesiaVoiceTest(result);
      return result;
    }
  }, [getDefaultCartesiaVoiceId, userEmail]);

  const testCartesiaWebSocket = useCallback(async (): Promise<TestResult> => {
    setCartesiaWsTest({ status: 'running', message: 'Connecting to Cartesia WebSocket...' });
    const start = Date.now();
    try {
      const { apiKey } = await getCartesiaApiKey({ userEmail });
      const { voiceId } = await getDefaultCartesiaVoiceId({ userEmail });
      if (!voiceId) throw new Error('No voice ID to test with');

      const result = await new Promise<TestResult>((resolve) => {
        const ws = new WebSocket(
          `wss://api.cartesia.ai/tts/websocket?api_key=${apiKey}&cartesia_version=2025-04-16`
        );
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ status: 'fail', message: 'Connection timeout (5s)', duration: Date.now() - start });
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          // Send a small TTS request
          ws.send(JSON.stringify({
            model_id: 'sonic-2',
            transcript: 'Test',
            voice: { mode: 'id', id: voiceId },
            language: 'en',
            output_format: {
              container: 'raw',
              encoding: 'pcm_s16le',
              sample_rate: 24000,
            },
            context_id: 'test-1',
          }));
        };

        let gotChunk = false;
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'chunk') {
              gotChunk = true;
            }
            if (data.type === 'done' || gotChunk) {
              ws.close();
              resolve({
                status: 'pass',
                message: `TTS working, received audio chunk`,
                duration: Date.now() - start,
              });
            }
            if (data.type === 'error') {
              ws.close();
              resolve({ status: 'fail', message: `Cartesia error: ${data.message || JSON.stringify(data)}`, duration: Date.now() - start });
            }
          } catch (_) {}
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({ status: 'fail', message: 'WebSocket connection failed', duration: Date.now() - start });
        };
      });

      setCartesiaWsTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setCartesiaWsTest(result);
      return result;
    }
  }, [getCartesiaApiKey, getDefaultCartesiaVoiceId, userEmail]);

  const testGeminiKey = useCallback(async (): Promise<TestResult> => {
    setGeminiKeyTest({ status: 'running', message: 'Fetching Gemini API key...' });
    const start = Date.now();
    try {
      const { apiKey } = await getGeminiApiKey({ userEmail });
      if (!apiKey) throw new Error('Empty API key returned');
      const masked = apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
      const result: TestResult = { status: 'pass', message: `Key: ${masked}`, duration: Date.now() - start };
      setGeminiKeyTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message || err?.data || 'Failed', duration: Date.now() - start };
      setGeminiKeyTest(result);
      return result;
    }
  }, [getGeminiApiKey, userEmail]);

  const testGeminiSession = useCallback(async (): Promise<TestResult> => {
    setGeminiSessionTest({ status: 'running', message: 'Testing Gemini Live session...' });
    const start = Date.now();
    try {
      const { apiKey } = await getGeminiApiKey({ userEmail });
      const { GoogleGenAI, Modality } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const result = await new Promise<TestResult>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ status: 'fail', message: 'Session connection timeout (8s)', duration: Date.now() - start });
        }, 8000);

        ai.live.connect({
          model: 'gemini-2.5-flash-preview-native-audio-dialog',
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: { parts: [{ text: 'Test session. Say nothing.' }] },
          },
          callbacks: {
            onopen: () => {
              clearTimeout(timeout);
            },
            onmessage: () => {},
            onerror: (e: ErrorEvent) => {
              clearTimeout(timeout);
              resolve({ status: 'fail', message: `Session error: ${e.message || 'Unknown'}`, duration: Date.now() - start });
            },
            onclose: () => {},
          },
        }).then((session) => {
          clearTimeout(timeout);
          // Immediately close — we just wanted to test connectivity
          try { session.close(); } catch (_) {}
          resolve({ status: 'pass', message: 'Gemini Live session connected successfully', duration: Date.now() - start });
        }).catch((err: any) => {
          clearTimeout(timeout);
          resolve({ status: 'fail', message: err.message || 'Connection failed', duration: Date.now() - start });
        });
      });

      setGeminiSessionTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message || 'Failed', duration: Date.now() - start };
      setGeminiSessionTest(result);
      return result;
    }
  }, [getGeminiApiKey, userEmail]);

  const testLiveKit = useCallback(async (): Promise<TestResult> => {
    setLivekitTest({ status: 'running', message: 'Checking LiveKit availability...' });
    const start = Date.now();
    try {
      // Just verify we can create a Room object and it has the right API
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      const hasConnect = typeof room.connect === 'function';
      const hasDisconnect = typeof room.disconnect === 'function';
      room.disconnect();

      if (!hasConnect || !hasDisconnect) {
        throw new Error('Room object missing required methods');
      }

      const result: TestResult = {
        status: 'pass',
        message: 'LiveKit client ready (Room API verified)',
        duration: Date.now() - start,
        details: `livekit-client loaded, Room constructor works`,
      };
      setLivekitTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setLivekitTest(result);
      return result;
    }
  }, []);

  const testFullPipeline = useCallback(async (): Promise<TestResult> => {
    setFullPipelineTest({ status: 'running', message: 'Testing full pipeline (Mic -> STT -> Translate -> TTS)...' });
    const start = Date.now();
    try {
      // 1. Get mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Get all API keys
      const [dg, or, ca, voice] = await Promise.all([
        getDeepgramApiKey({ userEmail }),
        getOpenRouterApiKey({ userEmail }),
        getCartesiaApiKey({ userEmail }),
        getDefaultCartesiaVoiceId({ userEmail }),
      ]);

      if (!dg.apiKey) throw new Error('No Deepgram key');
      if (!or.apiKey) throw new Error('No OpenRouter key');
      if (!ca.apiKey) throw new Error('No Cartesia key');
      if (!voice.voiceId) throw new Error('No voice ID');

      // 3. Test Deepgram WS connects
      const dgConnected = await new Promise<boolean>((resolve) => {
        const ws = new WebSocket(
          `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&encoding=linear16&sample_rate=16000&channels=1`,
          ['token', dg.apiKey]
        );
        const t = setTimeout(() => { ws.close(); resolve(false); }, 5000);
        ws.onopen = () => { clearTimeout(t); ws.close(); resolve(true); };
        ws.onerror = () => { clearTimeout(t); resolve(false); };
        ws.onclose = (e) => { if (e.code === 1006) { clearTimeout(t); resolve(false); } };
      });

      if (!dgConnected) throw new Error('Deepgram WebSocket failed to connect');

      // 4. Test OpenRouter translation
      const trResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${or.apiKey}` },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Translate to Spanish. Output ONLY the translation.' },
            { role: 'user', content: 'test' },
          ],
        }),
      });
      if (!trResponse.ok) throw new Error(`OpenRouter HTTP ${trResponse.status}`);

      // 5. Test Cartesia WS connects
      const caConnected = await new Promise<boolean>((resolve) => {
        const ws = new WebSocket(
          `wss://api.cartesia.ai/tts/websocket?api_key=${ca.apiKey}&cartesia_version=2025-04-16`
        );
        const t = setTimeout(() => { ws.close(); resolve(false); }, 5000);
        ws.onopen = () => { clearTimeout(t); ws.close(); resolve(true); };
        ws.onerror = () => { clearTimeout(t); resolve(false); };
      });

      if (!caConnected) throw new Error('Cartesia WebSocket failed to connect');

      stream.getTracks().forEach(t => t.stop());

      const result: TestResult = {
        status: 'pass',
        message: 'All pipeline components working',
        duration: Date.now() - start,
        details: 'Mic OK, Deepgram OK, OpenRouter OK, Cartesia OK',
      };
      setFullPipelineTest(result);
      return result;
    } catch (err: any) {
      const result: TestResult = { status: 'fail', message: err.message, duration: Date.now() - start };
      setFullPipelineTest(result);
      return result;
    }
  }, [getDeepgramApiKey, getOpenRouterApiKey, getCartesiaApiKey, getDefaultCartesiaVoiceId, userEmail]);

  // --- Run all tests ---
  const runAllTests = useCallback(async () => {
    setIsRunningAll(true);
    // Reset all
    setMicTest(DEFAULT_RESULT);
    setDeepgramKeyTest(DEFAULT_RESULT);
    setDeepgramWsTest(DEFAULT_RESULT);
    setOpenRouterKeyTest(DEFAULT_RESULT);
    setOpenRouterTranslateTest(DEFAULT_RESULT);
    setCartesiaKeyTest(DEFAULT_RESULT);
    setCartesiaVoiceTest(DEFAULT_RESULT);
    setCartesiaWsTest(DEFAULT_RESULT);
    setLivekitTest(DEFAULT_RESULT);
    setGeminiKeyTest(DEFAULT_RESULT);
    setGeminiSessionTest(DEFAULT_RESULT);
    setFullPipelineTest(DEFAULT_RESULT);

    // Run sequential to avoid overwhelming
    await testMicrophone();
    await testDeepgramKey();
    await testDeepgramWebSocket();
    await testOpenRouterKey();
    await testOpenRouterTranslation();
    await testCartesiaKey();
    await testCartesiaVoice();
    await testCartesiaWebSocket();
    await testLiveKit();
    await testGeminiKey();
    await testGeminiSession();
    await testFullPipeline();

    setIsRunningAll(false);
  }, [testMicrophone, testDeepgramKey, testDeepgramWebSocket, testOpenRouterKey, testOpenRouterTranslation, testCartesiaKey, testCartesiaVoice, testCartesiaWebSocket, testLiveKit, testGeminiKey, testGeminiSession, testFullPipeline]);

  const statusColor = (status: TestStatus) => {
    switch (status) {
      case 'pass': return 'var(--matcha-500)';
      case 'fail': return 'var(--terra-500)';
      case 'running': return '#e0b44c';
      default: return 'var(--text-muted)';
    }
  };

  const statusLabel = (status: TestStatus) => {
    switch (status) {
      case 'pass': return 'PASS';
      case 'fail': return 'FAIL';
      case 'running': return 'RUNNING';
      default: return 'IDLE';
    }
  };

  const TestRow: React.FC<{ label: string; result: TestResult; onRun: () => Promise<TestResult> }> = ({ label, result, onRun }) => (
    <div
      className="p-4 rounded-xl flex items-center justify-between gap-4"
      style={{ background: 'var(--bg-elevated)', border: `1px solid ${result.status === 'fail' ? 'var(--terra-300)' : 'var(--border-soft)'}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: statusColor(result.status), color: '#fff', minWidth: '60px', textAlign: 'center' }}
          >
            {statusLabel(result.status)}
          </span>
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
          {result.duration !== undefined && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{result.duration}ms</span>
          )}
        </div>
        <p className="text-xs truncate" style={{ color: result.status === 'fail' ? 'var(--terra-500)' : 'var(--text-secondary)' }}>
          {result.message}
        </p>
        {result.details && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{result.details}</p>
        )}
      </div>
      <button
        onClick={onRun}
        disabled={result.status === 'running'}
        className="matcha-btn matcha-btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
      >
        {result.status === 'running' ? (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
        ) : 'Run'}
      </button>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
        <Header />
        <main className="px-6 pb-12 pt-8">
          <div className="max-w-md mx-auto matcha-card p-8 text-center">
            <h2 className="text-xl font-serif mb-4" style={{ color: 'var(--text-primary)' }}>Sign in required</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>You must be authenticated to run pipeline tests.</p>
            <a href="/signin" className="matcha-btn matcha-btn-primary py-3 px-8 inline-block">Sign In</a>
          </div>
        </main>
      </div>
    );
  }

  const allResults = [micTest, deepgramKeyTest, deepgramWsTest, openRouterKeyTest, openRouterTranslateTest, cartesiaKeyTest, cartesiaVoiceTest, cartesiaWsTest, livekitTest, geminiKeyTest, geminiSessionTest, fullPipelineTest];
  const passCount = allResults.filter(r => r.status === 'pass').length;
  const failCount = allResults.filter(r => r.status === 'fail').length;
  const totalTests = allResults.length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <Header />
      <main className="px-6 pb-12 pt-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif text-gradient mb-2">Pipeline Diagnostics</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Test each component of the translation pipeline individually</p>
          </div>

          {/* Summary Bar */}
          <div className="matcha-card p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {passCount}/{totalTests} passed
              </span>
              {failCount > 0 && (
                <span className="text-sm font-medium" style={{ color: 'var(--terra-500)' }}>
                  {failCount} failed
                </span>
              )}
            </div>
            <button
              onClick={runAllTests}
              disabled={isRunningAll}
              className="matcha-btn matcha-btn-primary px-6 py-2 text-sm font-semibold"
            >
              {isRunningAll ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running...
                </span>
              ) : 'Run All Tests'}
            </button>
          </div>

          {/* Test Groups */}
          <div className="space-y-6">
            {/* Audio */}
            <div>
              <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>Audio Input</h2>
              <div className="space-y-2">
                <TestRow label="Microphone + AudioContext" result={micTest} onRun={testMicrophone} />
              </div>
            </div>

            {/* Deepgram STT */}
            <div>
              <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>Deepgram STT (Speech-to-Text)</h2>
              <div className="space-y-2">
                <TestRow label="API Key (from Convex)" result={deepgramKeyTest} onRun={testDeepgramKey} />
                <TestRow label="WebSocket Connection" result={deepgramWsTest} onRun={testDeepgramWebSocket} />
              </div>
            </div>

            {/* OpenRouter Translation */}
            <div>
              <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>OpenRouter Translation</h2>
              <div className="space-y-2">
                <TestRow label="API Key (from Convex)" result={openRouterKeyTest} onRun={testOpenRouterKey} />
                <TestRow label="Translation (en -> es)" result={openRouterTranslateTest} onRun={testOpenRouterTranslation} />
              </div>
            </div>

            {/* Cartesia TTS */}
            <div>
              <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>Cartesia TTS (Text-to-Speech)</h2>
              <div className="space-y-2">
                <TestRow label="API Key (from Convex)" result={cartesiaKeyTest} onRun={testCartesiaKey} />
                <TestRow label="Voice Availability" result={cartesiaVoiceTest} onRun={testCartesiaVoice} />
                <TestRow label="WebSocket + Audio Generation" result={cartesiaWsTest} onRun={testCartesiaWebSocket} />
              </div>
            </div>

            {/* LiveKit */}
            <div>
              <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>LiveKit (WebRTC)</h2>
              <div className="space-y-2">
                <TestRow label="Client Library" result={livekitTest} onRun={testLiveKit} />
              </div>
            </div>

            {/* Gemini Live */}
            <div>
              <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>Gemini Live (Speech-to-Speech)</h2>
              <div className="space-y-2">
                <TestRow label="API Key (from Convex)" result={geminiKeyTest} onRun={testGeminiKey} />
                <TestRow label="Live Session Connection" result={geminiSessionTest} onRun={testGeminiSession} />
              </div>
            </div>

            {/* Full Pipeline */}
            <div>
              <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>Full Pipeline (End-to-End)</h2>
              <div className="space-y-2">
                <TestRow label="Mic -> Deepgram -> OpenRouter -> Cartesia" result={fullPipelineTest} onRun={testFullPipeline} />
              </div>
            </div>
          </div>

          {/* Debug Info */}
          <div className="matcha-card p-4 mt-8">
            <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Debug Info</h3>
            <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              <p>User: {user?.email || 'N/A'}</p>
              <p>Browser: {navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
              <p>Secure Context: {window.isSecureContext ? 'Yes' : 'No'}</p>
              <p>AudioContext: {typeof AudioContext !== 'undefined' ? 'Available' : 'Unavailable'}</p>
              <p>WebSocket: {typeof WebSocket !== 'undefined' ? 'Available' : 'Unavailable'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PipelineTestPage;
