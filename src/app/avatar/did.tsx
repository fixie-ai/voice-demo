import React, { useState, useEffect, useRef } from 'react';
import { PeerConnectionClient } from './pc';

class DIDClient extends PeerConnectionClient {
  constructor(video: HTMLVideoElement, service: string) {
    super(video, "did", service);
  }
}

export function DIDPage({service, text}: {service: string, text: string}) {
  const clientRef = useRef<DIDClient | null>(null);
  const mediaElementRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Cleanup peer connection on component unmount
    return () => { clientRef.current?.close(); };
  }, []);

  const connect = async () => {
    clientRef.current = new DIDClient(mediaElementRef.current!, service);  
    clientRef.current.addEventListener('connected', (evt: CustomEventInit<boolean>) => setConnected(!!evt.detail));
    await clientRef.current.connect();
  };
  const generate = async () => clientRef.current?.generate({text}); 

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        <button onClick={connect} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Connect</button>
        <button onClick={generate} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Speak</button>
      </div>
      <div className="mt-6 w-[400px] h-[400px]">
        {connected && <div>Connection ready, press speak to render the avatar. </div>}
        <video ref={mediaElementRef} id="mediaElement" />
      </div>
    </div>
  );
};