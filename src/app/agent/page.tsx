"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FixieClient, VoiceSession, VoiceSessionInit, VoiceSessionState } from "fixie-web";
import { useSearchParams } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { getAgent, getAgentImageUrl } from "./agents";
import Image from "next/image";
import "../globals.css";

// 1. VAD triggers silence. (Latency here is frame size + VAD delay)
// 2. ASR sends partial transcript. ASR latency = 2-1.
// 3. ASR sends final transcript. ASR latency = 3-1.
// 4. LLM request is made. This can happen before 3 is complete, in which case the speculative execution savings is 3-2.
// 5. LLM starts streaming tokens. LLM base latency = 5-4.
// 6. LLM sends enough tokens for TTS to start (full sentence, or 50 chars). LLM token latency = 6-5, LLM total latency = 6-4.
// 7. TTS requests chunk of audio.
// 8. TTS chunk is received.
// 9. TTS playout starts (usually just about instantaneous after 8). TTS latency = 9-7.
// Total latency = 9-1 = ASR latency + LLM base latency + LLM token latency TTS latency - speculative execution savings.

// Token per second rules of thumb:
// GPT-4: 12 tps (approx 1s for 50 chars)
// GPT-3.5: 70 tps (approx 0.2s for 50 chars)
// Claude v1: 40 tps (approx 0.4s for 50 chars)
// Claude Instant v1: 70 tps (approx 0.2s for 50 chars)

interface LatencyThreshold {
  good: number;
  fair: number;
}

const DEFAULT_ASR_PROVIDER = "deepgram";
const DEFAULT_TTS_PROVIDER = "playht";
const DEFAULT_LLM = "gpt-4-1106-preview";
const ASR_PROVIDERS = [
  "aai",
  "deepgram",
  "deepgram-turbo",
  "gladia",
  "revai",
  "soniox",
];
const TTS_PROVIDERS = [
  "aws",
  "azure",
  "eleven",
  "eleven-ws",
  "gcp",
  "lmnt",
  "lmnt-ws",
  "murf",
  "openai",
  "playht",
  "resemble",
  "wellsaid",
];
const LLM_MODELS = [
  "claude-2",
  "claude-instant-1",
  "gpt-4",
  "gpt-4-32k",
  "gpt-4-1106-preview",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
];
const AGENT_IDS = ["ai-friend", "dr-donut", "rubber-duck"]; //, 'spanish-tutor', 'justin/ultravox', 'justin/fixie'];
const LATENCY_THRESHOLDS: { [key: string]: LatencyThreshold } = {
  ASR: { good: 300, fair: 500 },
  LLM: { good: 300, fair: 500 },
  LLMT: { good: 300, fair: 400 },
  TTS: { good: 400, fair: 600 },
  Total: { good: 1300, fair: 2000 },
};

const updateSearchParams = (param: string, value?: string, reload = false) => {
  const params = new URLSearchParams(window.location.search);
  if (value !== undefined) {
    params.set(param, value);
  } else {
    params.delete(param);
  }
  const newUrl = `${window.location.pathname}?${params}`;
  if (reload) {
    window.location.replace(newUrl);
  } else {
    window.history.pushState({}, "", newUrl);
  }
};

const Dropdown: React.FC<{
  label: string;
  param: string;
  value: string;
  options: string[];
}> = ({ param, label, value, options }) => (
  <>
    <label className="text-xs ml-2 font-bold">{label}</label>
    <select
      value={value}
      onChange={(e) => updateSearchParams(param, e.target.value, true)}
      className="text-xs ml-1 pt-1 pb-1 border rounded"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </>
);

const Stat: React.FC<{ name: string; latency: number; showName?: boolean }> = ({
  name,
  latency,
  showName = true,
}) => {
  let valueText = (latency ? `${latency.toFixed(0)}` : "-").padStart(4, " ");
  for (let i = valueText.length; i < 4; i++) {
    valueText = " " + valueText;
  }
  const color =
    latency < LATENCY_THRESHOLDS[name].good
      ? ""
      : latency < LATENCY_THRESHOLDS[name].fair
        ? "text-yellow-500"
        : "text-red-500";
  return (
    <span className={`font-mono text-xs mr-2 ${color}`}>
      {" "}
      {showName && <span className="font-bold">{name}</span>}
      {(showName || latency > 0) && (
        <>
          <pre className="inline">{valueText}</pre> ms
        </>
      )}
    </span>
  );
};

const Visualizer: React.FC<{
  width?: number;
  height?: number;
  state?: VoiceSessionState;
  inputAnalyzer?: AnalyserNode;
  outputAnalyzer?: AnalyserNode;
}> = ({ width, height, state, inputAnalyzer, outputAnalyzer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  if (canvasRef.current) {
    canvasRef.current.width = canvasRef.current.offsetWidth;
    canvasRef.current.height = canvasRef.current.offsetHeight;
  }
  if (inputAnalyzer) {
    inputAnalyzer.fftSize = 64;
    inputAnalyzer.maxDecibels = 0;
    inputAnalyzer.minDecibels = -70;
  }
  if (outputAnalyzer) {
    // We use a larger FFT size for the output analyzer because it's typically fullband,
    // versus the wideband input analyzer, resulting in a similar bin size for each.
    // Then, when we grab the lowest 16 bins from each, we get a similar spectrum.
    outputAnalyzer.fftSize = 256;
    outputAnalyzer.maxDecibels = 0;
    outputAnalyzer.minDecibels = -70;
  }
  const draw = (
    canvas: HTMLCanvasElement,
    state: VoiceSessionState,
    freqData: Uint8Array
  ) => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const marginWidth = 2;
    const barWidth = canvas.width / freqData.length - marginWidth * 2;
    const totalWidth = barWidth + marginWidth * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    freqData.forEach((freqVal, i) => {
      const barHeight = (freqVal * canvas.height) / 128;
      const x = barHeight + 25 * (i / freqData.length);
      const y = 250 * (i / freqData.length);
      const z = 50;
      if (state == VoiceSessionState.LISTENING) {
        ctx.fillStyle = `rgb(${x},${y},${z})`;
      } else if (state == VoiceSessionState.THINKING) {
        ctx.fillStyle = `rgb(${z},${x},${y})`;
      } else if (state == VoiceSessionState.SPEAKING) {
        ctx.fillStyle = `rgb(${y},${z},${x})`;
      }
      ctx.fillRect(
        i * totalWidth + marginWidth,
        canvas.height - barHeight,
        barWidth,
        barHeight
      );
    });
  };
  const render = useCallback(() => {
    let freqData: Uint8Array = new Uint8Array(0);
    switch (state) {
      case VoiceSessionState.LISTENING:
        if (!inputAnalyzer) return;
        freqData = new Uint8Array(inputAnalyzer!.frequencyBinCount);
        inputAnalyzer!.getByteFrequencyData(freqData);
        freqData = freqData.slice(0, 16);
        break;
      case VoiceSessionState.THINKING:
        freqData = new Uint8Array(16);
        // make the data have random pulses based on performance.now, which decay over time
        const now = performance.now();
        for (let i = 0; i < freqData.length; i++) {
          freqData[i] =
            Math.max(0, Math.sin((now - i * 100) / 100) * 128 + 128) / 2;
        }
        break;
      case VoiceSessionState.SPEAKING:
        if (!outputAnalyzer) return;
        freqData = new Uint8Array(outputAnalyzer!.frequencyBinCount);
        outputAnalyzer!.getByteFrequencyData(freqData);
        freqData = freqData.slice(0, 16);
        break;
    }
    draw(canvasRef.current!, state ?? VoiceSessionState.IDLE, freqData);
    requestAnimationFrame(render);
  }, [state, inputAnalyzer, outputAnalyzer]);
  useEffect(() => render(), [state, render]);
  let className = "";
  if (!width) className += " w-full";
  if (!height) className += " h-full";
  return (
    <canvas
      className={className}
      ref={canvasRef}
      width={width}
      height={height}
    />
  );
};

const Button: React.FC<{
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${
      disabled ? "bg-gray-300" : "bg-fixie-charcoal hover:bg-fixie-dark-gray"
    } rounded-md px-4 py-2 text-md font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon`}
  >
    {children}
  </button>
);

const AgentPageComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const [voiceSession, setVoiceSession] = useState<VoiceSession | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [started, setStarted] = useState(false);

  const [showStats, setShowStats] = useState(
    searchParams.get("stats") !== null
  );
  const [state, setState] = useState<VoiceSessionState>(VoiceSessionState.DISCONNECTED);
  const [asrLatency, setAsrLatency] = useState(0);
  const [llmResponseLatency, setLlmResponseLatency] = useState(0);
  const [llmTokenLatency, setLlmTokenLatency] = useState(0);
  const [ttsLatency, setTtsLatency] = useState(0);

  const agentId = searchParams.get("agent") || "dr-donut";
  const agentVoice = getAgent(agentId)?.ttsVoice;

  // Pull all the parameters out of the search params.
  const asrProvider = searchParams.get("asr") || DEFAULT_ASR_PROVIDER;
  const asrModel = searchParams.get("asrModel") || undefined;
  const asrLanguage = searchParams.get("asrLanguage") || undefined;
  const ttsProvider = searchParams.get("tts") || DEFAULT_TTS_PROVIDER;
  const ttsModel = searchParams.get("ttsModel") || undefined;
  const ttsVoice = searchParams.get("ttsVoice") || agentVoice;
  const model =
    getAgent(agentId) === undefined
      ? "fixie"
      : searchParams.get("llm") || DEFAULT_LLM;
  const docs = searchParams.get("docs") !== null;
  const webrtcUrl = searchParams.get("webrtc") ?? undefined;
  const [showChooser, setShowChooser] = useState(
    searchParams.get("chooser") !== null
  );
  const showInput = searchParams.get("input") !== null;
  const showOutput = searchParams.get("output") !== null;

  // Returns true if the voice session is active.
  const active = useCallback(() => {
    return (voiceSession && voiceSession!.state != VoiceSessionState.DISCONNECTED)
  }, [voiceSession]);

  // Stop the voice session.
  const handleStop = useCallback(() => {
    console.log(`handleStop - stopping voice session ${voiceSession}`);
    voiceSession!.stop();
  }, [voiceSession]);

  // Start the voice session.
  const handleStart = useCallback(() => {
    setInput("");
    setOutput("");
    setAsrLatency(0);
    setLlmResponseLatency(0);
    setLlmTokenLatency(0);
    setTtsLatency(0);
    if (voiceSession) {
      console.log(`handleStart - starting voice session ${voiceSession}`);
      voiceSession!.start();
    }
  }, [voiceSession]);

  // Create the voice session, configure it, and warm it up.
  const createSession = useCallback(() => {
    const fixieClient = new FixieClient({});
    const voiceInit: VoiceSessionInit = {
      webrtcUrl: webrtcUrl || "wss://wsapi.fixie.ai",
      asrProvider: asrProvider,
      ttsProvider: ttsProvider,
      ttsVoice: ttsVoice,
      model: model,
    };
    const session = fixieClient.createVoiceSession({
      agentId,
      init: voiceInit,
    });

    session.onStateChange = (state: VoiceSessionState) => {
      setState(state);
    };
    session.onInputChange = (text: string, final: boolean) => {
      setInput(text);
    };
    session.onOutputChange = (text: string, final: boolean) => {
      setOutput(text);
      if (final) {
        setInput("");
      }
    };
    session.onLatencyChange = (metric: string, value: number) => {
      switch (metric) {
        case "asr":
          setAsrLatency(value);
          setLlmResponseLatency(0);
          setLlmTokenLatency(0);
          setTtsLatency(0);
          break;
        case "llm":
          setLlmResponseLatency(value);
          break;
        case "llmt":
          setLlmTokenLatency(value);
          break;
        case "tts":
          setTtsLatency(value);
          break;
      }
    };
    session.onError = () => {
      session.stop();
    };
    console.log(`init - warming up voice session ${session}`);
    session.warmup();
    setVoiceSession(session);
    return session;
  }, [agentId, asrProvider, model, ttsProvider, ttsVoice, webrtcUrl]);

  // Called when the main button is clicked.
  const onButtonClick = useCallback(() => {
    if (!started) {
      const session = createSession();
      handleStart();
      session.start();
      setStarted(true);
    } else {
      handleStop();
      setStarted(false);
    }
  }, [createSession, handleStart, handleStop, started]);

  // This effect is used to stop the voice session in the component destructor.
  useEffect(() => {
    console.log(
      `[page] init asr=${asrProvider} tts=${ttsProvider} llm=${model} agent=${agentId} docs=${docs}`
    );
    return () => {
      console.log(`destructor - stopping voice session ${voiceSession}`);
      voiceSession?.stop();
    };
  }, [
    agentId,
    asrProvider,
    docs,
    model,
    ttsProvider,
    voiceSession,
  ]);

  const changeAgent = useCallback((delta: number) => {
    const index = AGENT_IDS.indexOf(agentId);
    const newIndex = (index + delta + AGENT_IDS.length) % AGENT_IDS.length;
    updateSearchParams("agent", AGENT_IDS[newIndex], true);
  }, [agentId]);


  // Spacebar starts or interrupts. Esc quits.
  // C toggles the chooser. S toggles the stats.
  const onKeyDown = useCallback((event: KeyboardEvent) => {
  // Either interrupt the vcoice session, or start it.
  const speak = () => (active() ? voiceSession!.interrupt() : handleStart());
    if (event.keyCode == 32) {
      speak();
      event.preventDefault();
    } else if (event.keyCode == 27) {
      handleStop();
      event.preventDefault();
    } else if (event.keyCode == 67) {
      const newVal = !showChooser;
      setShowChooser(newVal);
      updateSearchParams("chooser", newVal ? "1" : undefined);
      event.preventDefault();
    } else if (event.keyCode == 83) {
      const newVal = !showStats;
      setShowStats(newVal);
      updateSearchParams("stats", newVal ? "1" : undefined);
      event.preventDefault();
    } else if (event.keyCode == 37) {
      handleStop();
      changeAgent(-1);
      event.preventDefault();
    } else if (event.keyCode == 39) {
      handleStop();
      changeAgent(1);
      event.preventDefault();
    }
  }, [active, handleStart, voiceSession, changeAgent, handleStop, showChooser, showStats]);

  // Install our handlers, and clean them up on unmount.
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);
  const swipeHandlers = useSwipeable({
    onSwipedLeft: (eventData) => changeAgent(-1),
    onSwipedRight: (eventData) => changeAgent(1),
  });
  return (
    <>
      {showChooser && (
        <div className="absolute top-1 left-1">
          <Dropdown
            label="Agent"
            param="agent"
            value={agentId}
            options={AGENT_IDS}
          />
          <Dropdown
            label="ASR"
            param="asr"
            value={asrProvider}
            options={ASR_PROVIDERS}
          />
          <Dropdown
            label="LLM"
            param="llm"
            value={model}
            options={LLM_MODELS}
          />
          <Dropdown
            label="TTS"
            param="tts"
            value={ttsProvider}
            options={TTS_PROVIDERS}
          />
        </div>
      )}
      <div className="absolute top-1 right-1">
        {showStats && (
          <>
            <Stat name="ASR" latency={asrLatency} />
            <Stat name="LLM" latency={llmResponseLatency} />
            <Stat name="LLMT" latency={llmTokenLatency} />
            <Stat name="TTS" latency={ttsLatency} />
          </>
        )}
        <Stat
          name="Total"
          latency={
            asrLatency + llmResponseLatency + llmTokenLatency + ttsLatency
          }
          showName={showStats}
        />
      </div>
      <div className="w-full flex flex-col items-center justify-center text-center">
        <div>
          <Image
            src="/voice-logo.svg"
            alt="Fixie Voice"
            width={322}
            height={98}
            priority={true}
          />
        </div>
        <div className="flex justify-center p-4" {...swipeHandlers}>
          <Image
            priority={true}
            width="384"
            height="384"
            src={getAgentImageUrl(agentId)}
            alt={agentId}
          />
        </div>
        <div>
          {showOutput && (
            <div className="m-2 w-full text-md py-8 px-2 rounded-lg border-2 bg-fixie-light-dust">
              {output}
            </div>
          )}
        </div>
        <div>
          {showInput && (
            <div
              className={`m-2 w-full text-md h-12 rounded-lg border-2 bg-fixie-light-dust ${
                active() ? "border-red-400" : ""
              }`}
            >
              {input}
            </div>
          )}
        </div>
        <p className="py-4 text-lg font-mono">State: {state}</p>
        <div className="w-full max-w-sm p-4">
          <Visualizer
            height={64}
            state={voiceSession?.state}
            inputAnalyzer={voiceSession?.inputAnalyzer}
            outputAnalyzer={voiceSession?.outputAnalyzer}
          />
        </div>
        <div className="w-full flex justify-center mt-3">
          <Button disabled={false} onClick={onButtonClick}>
            { started ? "Stop" : "Start" }
          </Button>
        </div>
      </div>
    </>
  );
};

export default AgentPageComponent;
