// import React, { useState, useEffect, useRef } from 'react';

// interface DID_API {
//   url: string;
//   key: string;
//   service: string;
// }

// interface PresenterInput {
//   [service: string]: {
//     source_url?: string;
//     presenter_id?: string;
//     driver_id?: string;
//   };
// }

// export function DIDPage({text}: {text: string}) {
//   const videoElement = useRef<HTMLVideoElement>(null);
//   const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
//   const [streamId, setStreamId] = useState<string | null>(null);
//   const [sessionId, setSessionId] = useState<string | null>(null);

//   const presenterInputByService: PresenterInput = {
//     talks: {
//       source_url: 'https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg',
//     },
//     clips: {
//       presenter_id: 'rian-lZC6MmWfC1',
//       driver_id: 'mXra4jY38i',
//     },
//   };

//   // Similar to the original script, define other state variables and methods as needed.

//   useEffect(() => {
//     // Cleanup peer connection on component unmount
//     return () => {
//       if (peerConnection) {
//         peerConnection.close();
//         setPeerConnection(null);
//       }
//     };
//   }, [peerConnection]);

//   // Convert functions like `createPeerConnection`, `fetchWithRetries`, etc., into methods or use them inside useEffects.
//   const stopAllStreams = () => {
//     if (videoElement.current?.srcObject) {
//       console.log('stopping video streams');
//       const mediaStream = videoElement.current.srcObject as MediaStream;
//       mediaStream.getTracks().forEach((track) => track.stop());
//       videoElement.current.srcObject = null;
//     }
//   };

//   const closePC = () => {
//     if (!peerConnection) return;
//     console.log('stopping peer connection');
//     peerConnection.close();
//     // Remove all listeners to prevent memory leaks
//     setPeerConnection(null);
//   };

//   const fetchWithRetries = async (url: string, options: RequestInit, retries: number = 1, maxRetries: number = 3): Promise<Response> => {
//     try {
//       return await fetch(url, options);
//     } catch (err) {
//       if (retries < maxRetries) {
//         const delay = Math.min(Math.pow(2, retries) / 4 + Math.random(), 4) * 1000; // Adjust max delay as needed
//         await new Promise((resolve) => setTimeout(resolve, delay));
//         console.log(`Request failed, retrying ${retries}/${maxRetries}. Error: ${err}`);
//         return fetchWithRetries(url, options, retries + 1, maxRetries);
//       } else {
//         throw new Error(`Max retries exceeded. Error: ${err}`);
//       }
//     }
//   };

//   const createPeerConnection = async (offer: RTCSessionDescriptionInit, iceServers: any[]) => {
//     if (!peerConnection) {
//       const pc = new RTCPeerConnection({ iceServers });
//       // Event listeners setup here
//       pc.onicecandidate = (event) => {
//         console.log(`ICE Candidate: ${event.candidate}`);
//         // Handle the ICE candidate event
//       };
//       // Add more listeners as needed

//       setPeerConnection(pc);
//     }

//     await peerConnection?.setRemoteDescription(new RTCSessionDescription(offer));
//     console.log('Set remote SDP OK.');

//     const answer = await peerConnection?.createAnswer();
//     await peerConnection?.setLocalDescription(answer!);
//     console.log('Set local SDP OK.');

//     return answer;
//   };


//   const connect = async () => {
//     if (peerConnection && peerConnection.connectionState === 'connected') {
//       return;
//     }

//     stopAllStreams();
//     closePC();

//     const sessionResponse = await fetchWithRetries(`${DID_API.url}/${DID_API.service}/streams`, {
//       method: 'POST',
//       headers: {
//         Authorization: `Basic ${DID_API.key}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(presenterInputByService[DID_API.service]),
//     });

//     const { id: newStreamId, offer, ice_servers: iceServers, session_id: newSessionId } = await sessionResponse.json();
//     setStreamId(newStreamId);
//     setSessionId(newSessionId);

//     let sessionClientAnswer;

//     try {
//       sessionClientAnswer = await createPeerConnection(offer, iceServers);
//       // Handle sessionClientAnswer if needed
//     } catch (e) {
//       console.log('error during streaming setup', e);
//       stopAllStreams();
//       closePC();
//       return;
//     }

//     const sdpResponse = await fetch(`${DID_API.url}/${DID_API.service}/streams/${streamId}/sdp`, {
//       method: 'POST',
//       headers: {
//         Authorization: `Basic ${DID_API.key}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         answer: sessionClientAnswer,
//         session_id: sessionId,
//       }),
//     });

//     // Continue with SDP exchange or other necessary steps
//   };


//   const start = async () => {
//     // Ensure that connection states are supported and connected
//     if (peerConnection?.signalingState === 'stable' || peerConnection?.iceConnectionState === 'connected') {
//       // Modify the request URL and headers according to your API configuration
//       const playResponse = await fetchWithRetries(`${DID_API.url}/${DID_API.service}/streams/${streamId}`, {
//         method: 'POST',
//         headers: {
//           Authorization: `Basic ${DID_API.key}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           script: {
//             type: 'audio',
//             audio_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/webrtc.mp3',
//           },
//           ...(DID_API.service === 'clips' && {
//             background: {
//               color: '#FFFFFF',
//             },
//           }),
//           config: {
//             stitch: true,
//           },
//           session_id: sessionId,
//         }),
//       });

//       // Handle the response from the server
//       if (playResponse.ok) {
//         // Success logic here
//         console.log('Stream started successfully');
//       } else {
//         // Error handling
//         console.error('Failed to start stream');
//       }
//     }
//   };

//   const destroy = async () => {
//     if (!streamId || !sessionId) return; // Ensure streamId and sessionId are available

//     try {
//       const response = await fetch(`${DID_API.url}/${DID_API.service}/streams/${streamId}`, {
//         method: 'DELETE',
//         headers: {
//           Authorization: `Basic ${DID_API.key}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ session_id: sessionId }),
//       });

//       if (response.ok) {
//         console.log('Stream destroyed successfully');
//         stopAllStreams();
//         closePC();
//       } else {
//         // Handle response error
//         console.error('Failed to destroy stream');
//       }
//     } catch (error) {
//       console.error('Error destroying stream:', error);
//     }
//   };

//   return (
//     <div>
//       <video ref={videoElement} playsInline />
//       <button onClick={connect}>Connect</button>
//       <button onClick={start}>Start</button>
//       <button onClick={destroy}>Destroy</button>
//       {/* Add other elements based on your original script */}
//     </div>
//   );
// };