'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';


async function newSession(quality: any, avatar_name: any, voice_id: any) {
  const response = await fetch(`/avatar/api/heygen/newSession`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quality: quality,
      avatar_name: avatar_name,
      voice_id: voice_id,
    }),
  });
  if (response.status === 500) {
    console.error('Server error');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    console.log(data.data);
    return data.data;
  }
}

// start the session
async function startSession(session_id: any, sdp: any) {
  const response = await fetch(`/avatar/api/heygen/startSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id, sdp }),
  });
  if (response.status === 500) {
    console.error('Server error');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

// submit the ICE candidate
async function handleICE(session_id: any, candidate: any) {
  const response = await fetch(`/avatar/api/heygen/handleICE`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id, candidate }),
  });
  if (response.status === 500) {
    console.error('Server error');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data;
  }
}

// repeat the text
async function repeat(session_id: any, text: any) {
  const response = await fetch(`/avatar/api/heygen/repeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id, text }),
  });
  if (response.status === 500) {
    console.error('Server error');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

// stop session
async function stopSession(session_id: any) {
  const response = await fetch(`/avatar/api/heygen/stopSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id }),
  });
  if (response.status === 500) {
    console.error('Server error');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

// Interface for session info
interface SessionInfo {
  session_id: string;
  sdp: RTCSessionDescriptionInit;
  ice_servers2: RTCIceServer[];
}


export function HeyGenPage({text}:{text: string}) {
  // State variables
  const [status, setStatus] = useState<string>('');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [talkingToAI, setTalkingToAI] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [mediaCanPlay, setMediaCanPlay] = useState<boolean>(false);

  // References to media elements
  const mediaElementRef = useRef<HTMLVideoElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null); 

  // Event handlers (with type annotations)
  const createNewSession = async () => {
    console.log('Creating new session... please wait');

    // Simplified: Replace these with your actual logic to get these values
    const avatar = ''; // Example, replace with actual
    const voice = ''; // Example, replace with actual

    // Call the newSession function here
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
    peerConnection.ondatachannel = (event:any) => {
      console.log('Received data channel:', event);
    }

    peerConnectionRef.current = peerConnection;

    const remoteDescription = new RTCSessionDescription(session.sdp);
    await peerConnection.setRemoteDescription(remoteDescription);

    console.log('Session creation completed');
    console.log('Now you can click the start button to start the stream');
  };

  // Start session and display audio and video when clicking the "Start" button
  const startAndDisplaySession = useCallback(async () => {
    if (!sessionInfo) {
      console.log('Please create a connection first');
      return;
    }

    if (!peerConnectionRef.current) {
      console.log('Peer connection is not initialized.');
      return;
    }

    console.log('Starting session... please wait');

    try {
      const peerConnection = peerConnectionRef.current;
      const localDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(localDescription);

      // Assuming startSession function is implemented and available
      await startSession(sessionInfo.session_id, localDescription);
      console.log('Session started successfully');
    } catch (error) {
      console.error('Error starting session:', error);
      console.log('Error starting session');
    }
  }, [sessionInfo]);

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

      // Reset UI state
      setMediaCanPlay(false);

      console.log('Connection closed successfully');
    } catch (err) {
      console.error('Failed to close the connection:', err);
      console.log('Failed to close the connection');
    }
  }, [sessionInfo]);
  // useEffect for DOM element references
  useEffect(() => {
    if (mediaElementRef.current) {
      mediaElementRef.current.onloadedmetadata = () => {
        // Handle ready to play logic
      };
    }
  }, [mediaElementRef]);

  return (
    <div>
      {/* Page content, input elements, buttons, etc. */}

      {/* Reference your media and canvas elements */}
      <div className="flex flex-row gap-2">
        <button onClick={createNewSession} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Connect</button>
        <button onClick={startAndDisplaySession} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Start</button>
        <button onClick={repeatHandler} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Repeat</button>
        <button onClick={closeConnectionHandler} className="rounded-md bg-fixie-fresh-salmon hover:bg-fixie-ripe-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon">Close</button>
      </div>
      <div className="mt-6 w-[400px] h-[400px]">
        <video ref={mediaElementRef} id="mediaElement" />
      </div>
    </div>
  );
};
