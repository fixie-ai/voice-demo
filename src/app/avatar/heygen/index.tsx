'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { handleICE, newSession, repeat, startSession, stopSession } from './helper';

// Interface for session info
interface SessionInfo {
  session_id: string;
}


export function HeyGenPage({text}:{text: string}) {
  // State variables
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // References to media elements
  const mediaElementRef = useRef<HTMLVideoElement>(null);

  const initializeAndStartSession = async () => {
    console.log('Initializing and starting session... please wait');
  
    const avatar = ''; 
    const voice = '';
  
    try {
      // Assuming newSession is defined elsewhere and returns a promise of SessionInfo
      const session = await newSession('high', avatar, voice);
      setSessionInfo(session);
  
      const peerConnection = new RTCPeerConnection({ iceServers: session.ice_servers2 });
  
      peerConnection.onicecandidate = ({ candidate }) => {
        console.log('Received ICE candidate:', candidate);
        if (candidate) {
          handleICE(session.session_id, candidate);
        }
      };
  
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state changed to: ${peerConnection.iceConnectionState}`);
      };
  
      peerConnection.ontrack = (event) => {
        console.log('Received track:', event.track);
        if (mediaElementRef.current && (event.track.kind === 'audio' || event.track.kind === 'video')) {
          mediaElementRef.current.srcObject = event.streams[0];
          mediaElementRef.current.play().catch(err => {
            console.error("Error auto-playing video: ", err);
          });
        }
      };
      
      peerConnection.ondatachannel = (event) => {
        console.log('Received data channel:', event);
      }
  
      peerConnectionRef.current = peerConnection;
  
      const remoteDescription = new RTCSessionDescription(session.sdp);
      await peerConnection.setRemoteDescription(remoteDescription);
  
      const localDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(localDescription);
  
      await startSession(session.session_id, localDescription);
  
      console.log('Session initialized and started successfully');
      console.log('Now you can use the stream');
    } catch (error) {
      console.error('Error initializing or starting session:', error);
    }
  };

  const repeatHandler = useCallback(async () => {
    if (!sessionInfo) {
      console.log('Please create a connection first');
      return;
    }

    if (text === '') {
      alert('Please enter a task');
      return;
    }

    console.log('Sending task... please wait');
    try {
      await repeat(sessionInfo.session_id, text);
      console.log('Task sent successfully');
    } catch (error) {
      console.error('Error sending task:', error);
      console.log('Failed to send task');
    }
  }, [text, sessionInfo]);

  const closeConnectionHandler = useCallback(async () => {
    if (!sessionInfo) {
      console.log('Please create a connection first');
      return;
    }

    console.log('Closing connection... please wait');
    try {
      // Close local connection
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null; // Reset the peer connection reference

      // Call the close interface
      const resp = await stopSession(sessionInfo.session_id);
      console.log(resp);

      console.log('Connection closed successfully');
    } catch (err) {
      console.error('Failed to close the connection:', err);
      console.log('Failed to close the connection');
    }
  }, [sessionInfo]);


  return (
    <div className="flex flex-col gap-2">
      <div>HeyGen Demo</div>
      <p>1. Click connect. After a few seconds, you should see the avatar rendered.</p>
      <p>2. Click speak to have the avatar speak the text above.</p>
      <p>3. Click close to end the session.</p>
      <div className="flex flex-row gap-2">
        <button onClick={initializeAndStartSession} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Connect</button>
        <button onClick={repeatHandler} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Speak</button>
        <button onClick={closeConnectionHandler} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Close</button>
      </div>
      <div className="mt-6 w-[400px] h-[400px]">
        <video ref={mediaElementRef} id="mediaElement" />
      </div>
    </div>
  );
};
