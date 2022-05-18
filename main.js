const socket = io("http://localhost:8000")
const messageContainer = document.getElementById('message-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')


const APP_ID = "082bf9c5c9784417a42eade29b414af8"
const client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})

let localTracks = []    
let remoteUsers = {}

const name = prompt('What is your name?')
appendMessage('You joined')
socket.emit('new-user', name)

socket.on('chat-message', data => {
  appendMessage(`${data.name}: ${data.message}`)
})

socket.on('user-connected', name => {
  appendMessage(`${name} connected`)
})

socket.on('user-disconnected', name => {
  appendMessage(`${name} disconnected`)
})

messageForm.addEventListener('submit', e => {
  e.preventDefault()
  const message = messageInput.value
  appendMessage(`You: ${message}`)
  socket.emit('send-chat-message', message)
  messageInput.value = ''
})

function appendMessage(message) {
  const messageElement = document.createElement('div')
  messageElement.innerText = message
  messageContainer.append(messageElement)
}

let joinAndDisplayLocalStream = async () => {

    var CHANNEL = document.getElementById("name").value;
    //var CHANNEL = "test"
    const repsonse = await axios.get("http://localhost:8000/rtcToken?channelName="+CHANNEL);
    const TOKEN = repsonse["data"]["key"];

    client.on('user-published', handleUserJoined)

    client.on('user-left', handleUserLeft)

    let UID = await client.join(APP_ID, CHANNEL, TOKEN, null)

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()

    let player = `<div class="video-container" id="user-container-${UID}">
                        <div class="video-player" id="user-${UID}"></div>
                  </div>`
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)

    localTracks[1].play(`user-${UID}`)

    await client.publish([localTracks[0], localTracks[1]])
}

let joinStream = async () => {
    await joinAndDisplayLocalStream()
    document.getElementById('join-btn').style.display = 'none'
    document.getElementById('stream-controls').style.display = 'flex'
}

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user
    await client.subscribe(user, mediaType)

    if (mediaType === 'video'){
        let player = document.getElementById(`user-container-${user.uid}`)
        if (player != null){
            player.remove()
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div>
                 </div>`
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)

        user.videoTrack.play(`user-${user.uid}`)
    }

    if (mediaType === 'audio'){
        user.audioTrack.play()
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
}

let leaveAndRemoveLocalStream = async () => {
    for(let i = 0; localTracks.length > i; i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.leave()
    document.getElementById('join-btn').style.display = 'block'
    document.getElementById('stream-controls').style.display = 'none'
    document.getElementById('video-streams').innerHTML = ''
}

let toggleMic = async (e) => {
    if (localTracks[0].muted){
        await localTracks[0].setMuted(false)
        e.target.innerText = 'Mic on'
        e.target.style.backgroundColor = 'cadetblue'
    }else{
        await localTracks[0].setMuted(true)
        e.target.innerText = 'Mic off'
        e.target.style.backgroundColor = '#EE4B2B'
    }
}

let toggleCamera = async (e) => {
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false)
        e.target.innerText = 'Camera on'
        e.target.style.backgroundColor = 'cadetblue'
    }else{
        await localTracks[1].setMuted(true)
        e.target.innerText = 'Camera off'
        e.target.style.backgroundColor = '#EE4B2B'
    }
}

let screensShare = async () => {
    await handleScreenShare();
 }

 let handleScreenShare = async () => {

    let screenTrack = await Promise.all([
      AgoraRTC.createMicrophoneAudioTrack(),
      AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          framerate: 15,
          height: 720,
          width: 1280
        }
      }, "auto")
    ]);

      if(screenTrack instanceof Array)
      {
          streamTrack.screenVideoTrack = screenTrack[0];
          streamTrack.screenAudioTrack= screenTrack[1];
      }
      else
      {
          streamTrack.screenVideoTrack = screenTrack;
      }
      streamTrack.screenVideoTrack.play("local-player")
  }

  document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream)
  document.getElementById('mic-btn').addEventListener('click', toggleMic)
  document.getElementById('camera-btn').addEventListener('click', toggleCamera)
  document.getElementById('screen-share').addEventListener('click', screensShare )
  document.getElementById('join-btn').addEventListener('submit', function(event) {
      event.preventDefault();
      joinStream();
  })
