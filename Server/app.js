
//init du serveur http et du socket
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public')); //sert les fichiers clients dans le dossier "public"

var numUsers=0;

//connection d'un client sur le socket
io.on('connection', function(socket){

  var addedUser=false;

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    console.log("Connection: "+socket.username);
  });

 // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;
      console.log("Déconnection: "+socket.username);
    }
  });
});


//lancement du serveur sur le port 3000
http.listen(3000, function(){
  console.log('listening on *:3000');
});
