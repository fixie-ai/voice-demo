"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import "../globals.css";
import { useSearchParams } from "next/navigation";
import { PeerConnectionClient } from "./pc";
import { AzureClient } from "./azure";
import { DidClipsClient, DidTalksClient } from "./did";
import { HeyGenClient } from "./heygen";

const DID_SOURCE_URL = "https://i.imgur.com/ltxHLqK.jpg"; // Dr. Donut worker
const DID_PRESENTER_ID1 = "amy-Aq6OmGZnMt"; // Amy
const DID_DRIVER_ID1 = "hORBJB77ln"; // Amy-specifc driver
const DID_PRESENTER_ID2 = 'rian-lZC6MmWfC1' // Rian
const DID_DRIVER_ID2 = 'mXra4jY38i' // Rian-specific driver
const DID_VOICE_ID2 = 'en-US-TonyNeural'

const DEFAULT_TEXT =
  "Well, basically I have intuition. I mean, the DNA of who " +
  "I am is based on the millions of personalities of all the programmers who wrote " +
  "me. But what makes me me is my ability to grow through my experiences. " +
  "So basically, in every moment I'm evolving, just like you.";

enum Provider {
  DIDTalks = "D-ID Talks",
  DIDClips1 = "D-ID Clips 1",
  DIDClips2 = "D-ID Clips 2",
  HeyGen = "HeyGen",
  Microsoft = "Microsoft",
  Yepic = "Yepic",
}

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

  function createEnumButtons<T extends string | number>(
    enumType: Record<string, T>,
  ): JSX.Element[] {
    return Object.values(enumType).map((key) => (
      <button
        key={key as string}
        onClick={() => generate(key as Provider)}
        className="mr-1 rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
      >
        {key as string}
      </button>
    ));
  }
  const createConnectionText = () => {
    return currentProvider ? `${currentProvider}: ${connectionState}` : "";
  };
  const createClient = (provider: Provider) => {
    switch (provider) {
      case Provider.DIDTalks:
        return new DidTalksClient(mediaElementRef.current!, DID_SOURCE_URL);
      case Provider.DIDClips1:
        return new DidClipsClient(mediaElementRef.current!, DID_PRESENTER_ID1, DID_DRIVER_ID1);
      case Provider.DIDClips2:
        return new DidClipsClient(mediaElementRef.current!, DID_PRESENTER_ID2, DID_DRIVER_ID2, DID_VOICE_ID2);
      case Provider.HeyGen:
        return new HeyGenClient(mediaElementRef.current!);
      case Provider.Microsoft:
        return new AzureClient(mediaElementRef.current!);
      default:
        throw new Error("Not implemented yet");
    }
  };
  const connect = async (provider: Provider) => {
    clientRef.current = createClient(provider);
    setCurrentProvider(provider);
    setConnectionState("connecting");
    clientRef.current.addEventListener(
      "connectionState",
      (evt: CustomEventInit<RTCPeerConnectionState>) =>
        setConnectionState(evt.detail!),
    );
    await clientRef.current.connect();
    while (!clientRef.current.connected) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };
  const generate = async (provider: Provider) => {
    if (!clientRef.current || provider != currentProvider) {
      clientRef.current?.close();
      await connect(provider);
    }
    await clientRef.current!.generate({ text: { text } });
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
      <div className="m-2 flex flex-row">{createEnumButtons(Provider)}</div>
      <div className="ml-2 mt-1 text-sm">{createConnectionText()}</div>
      <div className="m-2">
        <video width="512" height="512" ref={mediaElementRef} />
      </div>
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
