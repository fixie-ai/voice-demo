
// new session
export async function newSession(quality: any, avatar_name: any, voice_id: any) {
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
export async function startSession(session_id: any, sdp: any) {
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
export async function handleICE(session_id: any, candidate: any) {
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
export async function repeat(session_id: any, text: any) {
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
export async function stopSession(session_id: any) {
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