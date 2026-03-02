const socket = io();
let localStream;
let peerConnection;
let isCameraOn = true;
let isAudioOn = true;

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

async function joinRoom() {
  const roomId = document.getElementById('roomInput').value.trim();
  if (!roomId) {
    alert('⚠️ من فضلك أدخل اسم الغرفة');
    return;
  }

  document.getElementById('status').innerText = `جاري الاتصال بالغرفة: ${roomId}...`;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = localStream;

    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
      document.getElementById('remoteVideo').srcObject = event.streams[0];
      document.getElementById('status').innerText = `✅ متصل في الحفه: ${roomId}`;
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate, roomId);
      }
    };

    socket.emit('join-room', roomId, socket.id);

    socket.on('offer', async (offer) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', answer, roomId);
    });

    socket.on('answer', (answer) => {
      peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

  } catch (err) {
    console.error('خطأ في الوصول للكاميرا أو الميكروفون', err);
    alert('فشل في الوصول للكاميرا أو الميكروفون. تأكد من السماح بالوصول في المتصفح.');
    document.getElementById('status').innerText = '❌ خطأ في الاتصال';
  }
}

function toggleCamera() {
  isCameraOn = !isCameraOn;
  localStream.getVideoTracks()[0].enabled = isCameraOn;
  document.querySelector('.controls button:nth-child(1)').innerText = 
    isCameraOn ? '📸 إيقاف الكاميرا' : '🎥 تشغيل الكاميرا';
}

function toggleAudio() {
  isAudioOn = !isAudioOn;
  localStream.getAudioTracks()[0].enabled = isAudioOn;
  document.querySelector('.controls button:nth-child(2)').innerText = 
    isAudioOn ? '🎤 كتم الصوت' : '🔊 إلغاء الكتم';
}
