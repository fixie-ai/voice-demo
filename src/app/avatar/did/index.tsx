import React, { useState, useEffect, useRef } from 'react';
import { handleICE, handleSDP, newSession, talk } from './helper';


export function DIDPage({text}: {text: string}) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const mediaElementRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);



  useEffect(() => {
    // Cleanup peer connection on component unmount
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, []);


  const connect = async () => {
    const sessionResponse = await newSession(); 

    console.log('Session response:', sessionResponse);

    const { id: newStreamId, offer, ice_servers: iceServers, session_id: newSessionId } = sessionResponse;
    setStreamId(newStreamId);
    setSessionId(newSessionId);

    const peerConnection = new RTCPeerConnection({ iceServers: iceServers });

    peerConnection.onicecandidate = ({ candidate }) => {
      console.log('Received ICE candidate:', candidate);
      if (candidate) {
        handleICE(newSessionId, newStreamId, candidate);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state changed to: ${peerConnection.iceConnectionState}`);
    }

    let lastBytesReceived = 0;

    let videoIsPlaying = false; 

    peerConnection.ontrack = (event) => {

      setInterval(async () => {
        const stats = await peerConnection.getStats(event.track);
      
        stats.forEach((report) => { 
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            
            const hasNewData = report.bytesReceived > lastBytesReceived; 
            const videoStatusChanged = videoIsPlaying !== report.bytesReceived > lastBytesReceived;
            
            if (hasNewData && mediaElementRef.current) {
              if (videoStatusChanged) {
                videoIsPlaying = report.bytesReceived > lastBytesReceived;
                console.log('Received track:', event.track);
                mediaElementRef.current.srcObject = event.streams[0];
                mediaElementRef.current.play().catch(err => {
                  console.error("Error auto-playing video: ", err);
                });
              }
             
            }
            lastBytesReceived = report.bytesReceived;
          }
        });
      }, 500); 
    };
    
  

    peerConnection.ondatachannel = (event) => {
      console.log('Received data channel:', event);
    }


    let sessionClientAnswer;

    try {
      await peerConnection.setRemoteDescription(offer);
      console.log('set remote sdp OK');

      sessionClientAnswer = await peerConnection.createAnswer();
      console.log('create local sdp OK');

      await peerConnection.setLocalDescription(sessionClientAnswer);
      console.log('set local sdp OK');

      // Handle sessionClientAnswer if needed
    } catch (e) {
      console.log('error during streaming setup', e);

      return;
    }
    peerConnectionRef.current = peerConnection;

    handleSDP(newSessionId, newStreamId, sessionClientAnswer);
    console.log('sessionid in connect', newSessionId)

    console.log('Session connected successfully');
    setConnected(true);

  };


  const start = async () => {
    // Ensure that connection states are supported and connected
    if (peerConnectionRef.current?.signalingState === 'stable' || peerConnectionRef.current?.iceConnectionState === 'connected') {
      console.log('Sesson id', sessionId);
      const playResponse = await talk(sessionId, streamId, 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/webrtc.mp3')
      console.log('playResponse', playResponse);
    }
  };


  return (
    <div className="flex flex-col gap-2">
      <div>DID Demo</div>
      <p>1. Click connect. Wait a few seconds.</p>
      <p>2. Click speak to have the avatar speak</p>
      <p>3. Reload the page to end the session.</p>
      <p>Note: this demo can only use canned audio (for now).</p>
      <div className="flex flex-row gap-2">
        <button onClick={connect} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Connect</button>
        <button onClick={start} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Speak</button>
      </div>

      <div className="mt-6 w-[400px] h-[400px]">
        {connected && <div>Connection ready, press speak to render the avatar. </div>}
        <video ref={mediaElementRef} id="mediaElement" />
      </div>

    </div>
  );
};