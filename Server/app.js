
//init du serveur http et du socket
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public')); //sert les fichiers clients dans le dossier "public"

var numUsers=0;//nonmbre dans la salle d'attente
var salle=["","","",""];//salle de jeu

//connection d'un client sur le socket
io.on('connection', function(socket){

  //refus au bout du 4ème dans la salle d'attente
  console.log(numUsers);
  if (numUsers>3) {
    socket.emit('sallePleine');
    socket.disconnect(true);
  } else {++numUsers;};

  //Etat de la salle à la connection du client
  socket.emit('MAJsalle',salle);

  // Inscription d'un joueur dans la salle
  socket.on('add user', (username,nojoueur) => {
    socket.username = username; // sotckage du nom du client
    salle[nojoueur-1]=username;
    socket.broadcast.emit('MAJsalle',salle);//on previent les autres
  });

  // Quand quelqu'un se déconnecte
  socket.on('disconnect', () => {
    --numUsers;
    salle[salle.indexOf(socket.username)]="";
    socket.broadcast.emit('MAJsalle',salle);
  });
});


//lancement du serveur sur le port 3000
http.listen(3000, function(){
  console.log('listening on *:3000');
});
