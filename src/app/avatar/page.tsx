"use client";
//<button onClick={connect} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Connect</button>

import { Suspense, useEffect, useRef, useState } from "react";
import "../globals.css";
import { useSearchParams } from "next/navigation";
import { PeerConnectionClient } from "./pc";

class DIDClient extends PeerConnectionClient {
  constructor(video: HTMLVideoElement, service: string) {
    super(video, "did", service);
  }
}

enum Provider {
  DIDTalks = "D-ID Talks",
  DIDClips = "D-ID Clips",
  HeyGen = "HeyGen",
  Microsoft = "Microsoft",
  Yepic = "Yepic",
}

const DEFAULT_TEXT =
  "Well, basically I have intuition. I mean, the DNA of who " +
  "I am is based on the millions of personalities of all the programmers who wrote " +
  "me. But what makes me me is my ability to grow through my experiences. " +
  "So basically, in every moment I'm evolving, just like you.";

function AvatarHome() {
  const searchParams = useSearchParams();
  const textParam = searchParams.get("text");
  const [text, setText] = useState(textParam || DEFAULT_TEXT);
  const clientRef = useRef<PeerConnectionClient | null>(null);
  const mediaElementRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Cleanup peer connection on component unmount
    return () => {
      clientRef.current?.close();
    };
  }, []);

  function createEnumButtons<T extends string | number>(
    enumType: Record<string, T>,
  ): JSX.Element[] {
    return Object.values(enumType).map((key) => (
      <button
        key={key as string}
        onClick={() => generate(key as Provider)}
        className="m-1 rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
      >
        {key as string}
      </button>
    ));
  }
  const createClient = (provider: Provider) => {
    switch (provider) {
      case Provider.DIDTalks:
        return new PeerConnectionClient(
          mediaElementRef.current!,
          "did",
          "talks",
        );
      case Provider.DIDClips:
        return new PeerConnectionClient(
          mediaElementRef.current!,
          "did",
          "clips",
        );
      case Provider.HeyGen:
        return new PeerConnectionClient(mediaElementRef.current!, "heygen");
      default:
        throw new Error("Not implemented yet");
    }
  };
  const connect = async (provider: Provider) => {
    clientRef.current = createClient(provider);
    clientRef.current.addEventListener(
      "connected",
      (evt: CustomEventInit<boolean>) => setConnected(!!evt.detail),
    );
    await clientRef.current.connect();
    while (!clientRef.current.connected) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };
  const generate = async (provider: Provider) => {
    if (!clientRef.current) {
      await connect(provider);
    }
    await clientRef.current?.generate({ text: { text } });
  };

  return (
    <div className="flex min-h-screen flex-col items-start">
      <p className="font-sm ml-2 mb-2">
        This demo showcases the different avatar providers.
      </p>
      <div className="flex">
        <div className="flex-1 m-2">
          <textarea
            cols={60}
            rows={8}
            id="input"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
          ></textarea>
        </div>
        <div className="flex-1 m-2">
          <video
            width="256"
            height="256"
            ref={mediaElementRef}
            className="border border-black"
          />
        </div>
      </div>
      <div className="m-2 flex flex-row">{createEnumButtons(Provider)}</div>
      {connected && <div>Connected</div>}
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
