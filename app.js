//init des dependancies: express, socket.io, express-session, cookie
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
var cookie=require('cookie');

//Chargement du module Game (modèle)
var Game=require('./Game.js')

app.use(session);
app.use(express.static(__dirname + '/Public')); //sert les fichiers clients dans le dossier "public

//lancement du serveur sur le port 3000
http.listen(process.env.PORT || 3000);

var game;
var controleur;
var salle=Array(4);
var salleOld=Array(4);

//constructeur objet Joueur
function Joueur(name, socket){
  this.name=name;
  this.socket=socket;
  this.cookie=cookie.parse(socket.handshake.headers.cookie)['connect.sid'];
  this.promise;
}

//gestion des connections et échanges avec l'UI
io.on('connection',socket=>{
  //fonction de gestion de la connection
  function connection(debug){
    let id=cookie.parse(socket.handshake.headers.cookie)['connect.sid'];
    let no=salle.map(joueur=>(joueur && joueur.cookie)).indexOf(id);
    if (no!=(-1)&&!debug){//le joueur existe deja dans la salle, on jete la nouvelle connection
      socket.disconnect(true);
    } else {
      no=salleOld.map(joueur=>(joueur && joueur.cookie)).indexOf(id);
      if (no!=(-1) && salle[no]==undefined && !debug){ //c'est une reconnection
        salle[no]=new Joueur(salleOld[no].name,socket);
        socket.emit('refresh',no);
        //Todo: renvoyer l'état sur reconnection
      } else if (!salle.includes(undefined)){
        socket.emit('sallePleine',()=>socket.disconnect(true));//la salle est pleine
      } else {
        socket.emit('add user',([nomjoueur,no])=>{
          salle[no]=new Joueur(nomjoueur,socket);
          io.emit('new user',salle.map(joueur=>(joueur && joueur.name)));
          if (!salle.includes(undefined)){
            game=new Game();
            controleur=new Controleur();
            controleur.start();
          }
        })
      }
    }
  }

  //Envoi des données à jour à la demande
  socket.on('getData', fn =>{
    let no=salle.map(joueur=>(joueur && joueur.socket)).indexOf(socket);
    let data={
      'joueurs': salle.map(joueur=>(joueur && joueur.name)),
      'scores': (game && game.scores)||[,],
      'etoiles': (game && game.etoiles)||[,],
      'donneur': (game && game.donneur),
      'preneur':(game && game.donne.preneur),
      'contrat':(game && game.donne.contrat)||[,,],
      'joueuractif': (controleur && controleur.joueuractif),
      'pli':(game && game.donne.pli)||[,,,],
      'ramasseur':(game && game.donne.ramasseur),
      'pointsfaits':(game && game.donne.pointsfaits),
      'main': (no!=(-1)?(game && game.donne.mains[no]):null)
    }
    fn(data);
  });

  socket.on('getMains', fn=>{
    fn(game.donne.mains);
  })

  connection(true);//Debug: true=ok pour doubles connections

  //Déconnection
  socket.on('disconnect', () => {
    var id=cookie.parse(socket.handshake.headers.cookie)['connect.sid'];
    var no=salle.map(joueur=>(joueur && joueur.cookie)).indexOf(id);
    if (no != (-1)){
      salleOld[no]=salle[no];
      salle[no]=undefined;
    };
  });
})

function Controleur(){


  function pPhase(phase,joueur,index){
    return new Promise((resolve,reject)=>{
      joueur.socket.emit('phase',phase,(data)=>{
        resolve([data,index]);
      })
    })
  }

  function annonces(){
    this.joueuractif=(game.donneur+1)%4;
    //Annonces: on attend une seule réponse (race)
    Promise.race(salle.map((joueur,index)=>pPhase('annonces',joueur,index)))
    .then(([data,nojoueur])=>{
      if (data=='Jeprends'){
        game.preneur=nojoueur;
        this.saisieContrat(nojoueur);
      } else {
        this.montrerJeux();
      }
    })
  }

  function montrerJeux(){
    this.joueuractif=null;
    Promise.all(salle.map(joueur=>pPhase('montrerJeux',joueur)))
    .then(()=>{
      game.redonner();
      this.annonces();
    })
  }

  function saisieContrat(nojoueur){
    this.joueuractif=null;
    salle[nojoueur].socket.broadcast.emit('phase','attenteContrat');
    pPhase('saisieContrat',salle[nojoueur])
    .then(([contrat,index])=>{
      game.debuterLaDonne(nojoueur,contrat);
      this.jeuDeLaCarte((game.donneur+1)%4);
    });
  }

  function jeuDeLaCarte(joueur){
    this.joueuractif=joueur;
    salle[this.joueuractif].socket.broadcast.emit('phase','attenteCarte');
    pPhase('poseCarte',salle[this.joueuractif])
    .then(([carte,index])=>{
      [etat, joueursuivant]=game.jouerCarte(carte,this.joueuractif);
      if (etat=='carteSuivante'){this.jeuDeLaCarte(joueursuivant)};
      if (etat=='pliSuivant'){this.ramassePli(joueursuivant)};
      if (etat=='donneSuivante'){this.finDeDonne()};
    })
  }

  function ramassePli(joueur){
    this.joueuractif=joueur;
    salle[this.joueuractif].socket.broadcast.emit('phase','attentePli');
    pPhase('ramassePli',salle[this.joueuractif])
    .then(()=>{
      game.finDePli();
      this.jeuDeLaCarte(joueur);
    })
  }

  function finDeDonne(){
    this.joueuractif=joueur;
    salle[this.joueuractif].socket.broadcast.emit('phase','attentePli');
    pPhase('ramassePli',salle[this.joueuractif])
    .then(()=>{
      game.finDeDonne();
      this.afficheScores();
    })
  }

  function afficheScores(){
    this.joueuractif=null;
    Promise.all(salle.map(joueur=>pPhase('afficheScores',joueur)))
    .then((data)=>{
      let scores=data.map(([score,index])=>{return score})
      if (scores[0][0]==scores[1][0] && scores[1][0]==scores[2][0] &&scores[2][0]==scores[3][0]){
        if (scores[0][1]==scores[1][1] && scores[1][1]==scores[2][1] &&scores[2][1]==scores[3][1]){
          game.scores[0]=parseInt(scores[0][0]);
          game.scores[1]=parseInt(scores[0][1]);
        }
      }
      game.nouvelleDonne();
      this.annonces();
    })
  }

  this.afficheScores=afficheScores;
  this.annonces=annonces;
  this.finDeDonne=finDeDonne;
  this.jeuDeLaCarte=jeuDeLaCarte;
  this.montrerJeux=montrerJeux;
  this.saisieContrat=saisieContrat;
  this.ramassePli=ramassePli;

  this.joueuractif=1;
  this.start=annonces;
}

