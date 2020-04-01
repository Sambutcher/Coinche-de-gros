

var socket = io();//connection au socket
var p;

socket.on('numUsers',(numUsers)=>{
  if (numUsers==2){
    p = new SimplePeer({
      initiator: true,
      //trickle: false
    })
  } else {
    p = new SimplePeer({
      initiator: false,
      //trickle: false
    })
  }
  p.on('signal', data => {
      socket.emit('peer',JSON.stringify(data));
  })

  socket.on('peer',data=>{
    p.signal(JSON.parse(data));
  })

  p.on('connect', () => {
    console.log('envoi du stream')
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    }).then(addMedia).catch(() => {})
  })

  p.on('data', data => {
    console.log('data: ' + data)
  })

  p.on('stream', stream => {
    // got remote video stream, now let's show it in a video tag
    var video = document.querySelector('video')

    if ('srcObject' in video) {
      video.srcObject = stream
    } else {
      video.src = window.URL.createObjectURL(stream) // for older browsers
    }

    video.play()
  })
})

function addMedia (stream) {
  p.addStream(stream) // <- add streams to peer dynamically
}
