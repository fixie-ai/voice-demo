"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import "../globals.css";
import { useSearchParams } from "next/navigation";
import { PeerConnectionClient } from "./pc";
import { AzureClient } from "./azure";
import { DidClipsClient, DidTalksClient } from "./did";
import { HeyGenClient } from "./heygen";

const DID_SOURCE_URL = "https://i.imgur.com/ltxHLqK.jpg"; // Dr. Donut worker

const DEFAULT_TEXT =
  "Well, basically I have intuition. I mean, the DNA of who " +
  "I am is based on the millions of personalities of all the programmers who wrote " +
  "me. But what makes me me is my ability to grow through my experiences. " +
  "So basically, in every moment I'm evolving, just like you.";

enum Provider {
  DIDTalks = "D-ID Talks",
  DIDClips = "D-ID Clips",
  HeyGen = "HeyGen",
  Microsoft = "Microsoft",
  Yepic = "Yepic",
}

interface AvatarConfig {
  avatarId: string;
  voiceId?: string;
}

const AVATAR_MAP: Record<Provider, AvatarConfig[]> = {
  [Provider.DIDTalks]: [{ avatarId: DID_SOURCE_URL }],
  [Provider.DIDClips]: [
    { avatarId: "amy-Aq6OmGZnMt/hORBJB77ln" },
    { avatarId: "rian-lZC6MmWfC1/mXra4jY38i", voiceId: "en-US-TonyNeural" },
  ],
  [Provider.HeyGen]: [
    //{avatarId: "default"},
    { avatarId: "Angela-inblackskirt-20220820" },
    { avatarId: "Anna_public_3_20240108" },
    { avatarId: "Kayla-incasualsuit-20220818" },
    { avatarId: "Kristin_public_2_20240108" },
    { avatarId: "Tyler-incasualsuit-20220721", voiceId: "en-US-GuyNeural" },
  ],
  [Provider.Microsoft]: [{ avatarId: "lisa" }],
  [Provider.Yepic]: [{ avatarId: "default" }],
};

interface AvatarProviderProps {
  type: Provider;
  configs: AvatarConfig[];
  generate: (provider: Provider, avatarId: string) => void;
}

const AvatarProvider: React.FC<AvatarProviderProps> = ({
  type,
  configs,
  generate,
}: AvatarProviderProps) => {
  const [selectedId, setSelectedId] = useState(configs[0].avatarId);
  const handleChange = (event: any) => {
    setSelectedId(event.target.value);
  };
  const idToName = (id: string) => {
    const match = id.match(/^[A-Za-z]+/); // Match only leading alpha characters
    const [result] = match!;
    return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
  };

  return (
    <div key={type as string} className="mr-2">
      <div>
        <button
          onClick={() => generate(type, selectedId)}
          className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon w-full mb-1"
        >
          {type as string}
        </button>
      </div>
      <div>
        <select className="rounded-md text-sm" onChange={handleChange}>
          {configs.map((config: AvatarConfig) => (
            <option key={config.avatarId} value={config.avatarId}>
              {idToName(config.avatarId)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

function AvatarHome() {
  const searchParams = useSearchParams();
  const textParam = searchParams.get("text");
  const [text, setText] = useState(textParam || DEFAULT_TEXT);
  const mediaElementRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<PeerConnectionClient | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [connectionState, setConnectionState] = useState("");

  useEffect(() => {
    // Cleanup peer connection on component unmount
    return () => {
      clientRef.current?.close();
    };
  }, []);

  const createClient = (provider: Provider, avatarId: string) => {
    const config = AVATAR_MAP[provider].find(
      (config: AvatarConfig) => config.avatarId === avatarId,
    );
    if (!config) {
      throw new Error(
        `Avatar ID ${avatarId} not found for provider ${provider}`,
      );
    }
    let ctor;
    switch (provider) {
      case Provider.DIDTalks:
        ctor = DidTalksClient;
        break;
      case Provider.DIDClips:
        ctor = DidClipsClient;
        break;
      case Provider.HeyGen:
        ctor = HeyGenClient;
        break;
      case Provider.Microsoft:
        ctor = AzureClient;
        break;
      default:
        throw new Error("Not implemented yet");
    }
    return new ctor(mediaElementRef.current!, config.avatarId, config.voiceId);
  };
  const connect = async (provider: Provider, avatarId: string) => {
    clientRef.current = createClient(provider, avatarId);
    setCurrentProvider(provider);
    setConnectionState("connecting");
    clientRef.current.addEventListener(
      "connectionState",
      (evt: CustomEventInit<RTCPeerConnectionState>) =>
        setConnectionState(evt.detail!),
    );
    console.log(`Connecting to ${provider} with ${avatarId}...`);
    await clientRef.current.connect();
    while (!clientRef.current.connected) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };
  const generate = async (provider: Provider, avatarId: string) => {
    // Force element to play from our click handler to make Safari happy.
    if (
      !clientRef.current ||
      provider != currentProvider ||
      avatarId != clientRef.current.avatarId
    ) {
      clientRef.current?.close();
      mediaElementRef.current!.srcObject = null;
      mediaElementRef.current!.play();
      await connect(provider, avatarId);
    }
    await clientRef.current!.generate({ text: { text } });
  };
  function createProviders(): JSX.Element[] {
    return Object.entries(AVATAR_MAP).map(([type, configs]) => (
      <AvatarProvider
        key={type}
        type={type as Provider}
        configs={configs}
        generate={generate}
      />
    ));
  }
  const createConnectionText = () => {
    return currentProvider ? `${currentProvider}: ${connectionState}` : "";
  };

  return (
    <div className="flex min-h-screen flex-col items-start">
      <p className="font-sm ml-2 mb-2">
        This demo showcases the different avatar providers.
      </p>
      <div className="m-2 mb-1">
        <textarea
          cols={60}
          rows={5}
          id="input"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
        ></textarea>
      </div>
      <div className="m-2 flex flex-row">{createProviders()}</div>
      <div className="m-2 relative">
        <video
          className="top-0 left-0"
          width="910"
          height="512"
          playsInline
          muted
          autoPlay
          loop
          src="https://www.shutterstock.com/shutterstock/videos/27478456/preview/stock-footage-closed-white-window-overlooking-green-garden.webm"
        />
        <video
          className="absolute top-0 left-0"
          width="512"
          height="512"
          playsInline
          ref={mediaElementRef}
        />
      </div>
      <div className="ml-2 mt-1 text-sm">{createConnectionText()}</div>
    </div>
  );
}

export default function SuspenseAvatarHome() {
  return (
    <Suspense>
      <AvatarHome />
    </Suspense>
  );
}
