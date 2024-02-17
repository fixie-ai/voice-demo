'use client';
async function doPost(url: string, data: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const rawResponse = await response.json();
  if (response.status === 500) {
    console.error(response.status, 'Server error', rawResponse);
    throw new Error('Server error', rawResponse);
  } else {
    return rawResponse.data;
  }
}

// create a new session
export async function newSession(quality: any, avatar_name: any, voice_id: any) {
  return doPost(`/avatar/api/heygen/newSession`, { quality: quality, avatar_name: avatar_name, voice_id: voice_id });
}

// start the session
export async function startSession(session_id: any, sdp: any) {
  return doPost(`/avatar/api/heygen/startSession`, { session_id, sdp });
}

// submit the ICE candidate
export async function handleICE(session_id: any, candidate: any) {
  return doPost(`/avatar/api/heygen/handleICE`, { session_id, candidate });
}

// repeat the text
export async function repeat(session_id: any, text: any) {
  return doPost(`/avatar/api/heygen/repeat`, { session_id, text });
}

// stop session
export async function stopSession(session_id: any) {
  return doPost(`/avatar/api/heygen/stopSession`, { session_id });
}
