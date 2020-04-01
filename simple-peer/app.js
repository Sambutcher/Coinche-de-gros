//init du serveur http et du socket (nécessite d'installer express et socket sur le serveur node)
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
numUsers=0;

app.use(express.static(__dirname + '/public')); //sert les fichiers clients dans le dossier "public"

//TODO: intégrer simple-peer
//***evenements du serveur***

//connection d'un client sur le socket
io.on('connection', function(socket){
  if (numUsers==3) {
    socket.disconnect(true);
  } else {++numUsers;};
  // Quand quelqu'un se déconnecte
  socket.on('disconnect', () => {
    --numUsers;
  });

  socket.emit('numUsers',numUsers);

  socket.on('peer',data=>{
    socket.broadcast.emit('peer',data);
  });

});

//lancement du serveur sur le port 3000
http.listen(3000);
