'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PeerConnectionClient } from './pc';

class HeyGenClient extends PeerConnectionClient {
  constructor(mediaElement: HTMLVideoElement) {
    super(mediaElement, "heygen");
  }
}

export function HeyGenPage({text}:{text: string}) {
  const clientRef = useRef<HeyGenClient | null>(null);
  const mediaElementRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Cleanup peer connection on component unmount
    return () => { clientRef.current?.close(); };
  }, []);
  
  const connect = async () => {    
    if (clientRef.current) {
      return;
    }
    clientRef.current = new HeyGenClient(mediaElementRef.current!);
    await clientRef.current.connect();
  }
      
  const generate = async () => clientRef.current?.generate({text});

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        <button onClick={connect} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Connect</button>
        <button onClick={generate} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Speak</button>
      </div>
      <div className="mt-6 w-[400px] h-[400px]">
        <video ref={mediaElementRef} id="mediaElement" />
      </div>
    </div>
  );
};
