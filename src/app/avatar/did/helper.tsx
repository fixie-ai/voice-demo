'use client';

async function doPost(path: string, data: any) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  try {
    const rawResponse = await response.json();
    if (response.status === 500) {
      console.error(response.status, 'Server error', rawResponse);
      throw new Error('Server error', rawResponse);
    } else {
      return rawResponse;
    } 
  } catch (e) {
    console.error('Error parsing response', e);
    return null; 
  }

}

// create a new session
export async function newSession() {
  const data = await doPost(`/avatar/api/did/newSession`, {});
  return data; 
}

// handle ice candidate
export async function handleICE(session_id: any, stream_id: any, candidateBody: any) {
  const { candidate, sdpMid, sdpMLineIndex } = candidateBody;

  console.log('sessionid', session_id)

  const data = await doPost(`/avatar/api/did/handleICE`, { session_id, stream_id, candidate, sdpMid, sdpMLineIndex });
  console.log('handleICE', data);
  return data;
}

export async function handleSDP(session_id: any, stream_id: any, answer: any) {
  const data = await doPost(`/avatar/api/did/sdp`, { session_id, stream_id, answer });
  console.log('handleSDP', data);
  return data;
}


// talk
export async function talk(session_id: any, stream_id: any, audio_url: any) {
  const data = await doPost(`/avatar/api/did/talk`, { session_id, stream_id, audio_url});
  return data;
}
