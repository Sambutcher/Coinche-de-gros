//init du serveur http et du socket (nécessite d'installer express et socket sur le serveur node)
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public')); //sert les fichiers clients dans le dossier "public"

var numUsers=0;//nombre dans la salle d'attente
var salle=["","","",""];//salle de jeu
var points=[0,0];
var jeu;//tas de carte
var donne; //suivi de la donne en cours
var pli=[-1,-1,-1,-1];//pli en cours: n0 de carte dans la main du joueur
var flagDonneSuivante=0;//pour relancer une donne quand tout le monde valide
const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];

//***evenements du serveur***

//connection d'un client sur le socket
io.on('connection', function(socket){

  //refus au bout du 4ème dans la salle d'attente
  if (numUsers>3) {
    socket.emit('sallePleine');
    socket.disconnect(true);
  } else {++numUsers;};

  //Etat de la salle à la connection du client
  socket.emit('MAJsalle',salle);

  // Inscription d'un joueur dans la salle et lancement de la partie
  socket.on('add user', (username,nojoueur) => {
    socket.nojoueur = nojoueur;
    salle[nojoueur] = username;
    socket.broadcast.emit('MAJsalle',salle);//on previent les autres
    socket.emit('MAJsalle',salle);
    if (salle[0]!="" && salle[1]!="" && salle[2]!="" && salle[3]!=""){//lancement de la partie
      jeu = new Jeu();
      donne = new Donne(0);
      jeu.melanger();
      donne.distribuer(jeu);
      io.emit('debutDeDonne', 0);
    };
  });

  // Quand quelqu'un se déconnecte
  socket.on('disconnect', () => {
    --numUsers;
    if (socket.nojoueur){salle[socket.nojoueur]=""};
    socket.broadcast.emit('MAJsalle',salle);
    //TODO: si deconnection en cours de jeu, faire qq chose
  });

  //TODO: gerer la reconnection

  //Envoi la main quand on lui demande
  socket.on('pingMain',(fn)=>{
    fn(donne["main"+socket.nojoueur]);
  })

  //Un joueur prends
  socket.on('Jeprends',(data)=>{
    donne.contrat=data;
    if (data[0]=="Générale"){donne.contrat.alamain=data[3]};
    io.emit('atoidejouer',donne.alamain);
  })

  //le 4ème joueur passe
  socket.on('Redonner',()=>{
    jeu.melanger();
    nouveaudonneur=(donne.donneur+1)%4;
    donne=new Donne(nouveaudonneur);
    donne.distribuer(jeu);
    io.emit('debutDeDonne',nouveaudonneur);
  })

  //TODO: "j'annule"

  //Un joueur a joué une carte
  socket.on('cartejouee',(carte)=>{
    socket.broadcast.emit('carteposee',donne['main'+socket.nojoueur][carte],socket.nojoueur);//on previent les autres qu'une carte a été posée
    pli[socket.nojoueur]=carte;
    if (pli.every(e=>e!=(-1))){ //on a remplit le pli
      io.emit('turamasses',[donne.main0[pli[0]],donne.main1[pli[1]],donne.main2[pli[2]],donne.main3[pli[3]]],donne.ramasseur(pli));
    } else {
      io.emit('atoidejouer',(socket.nojoueur+1)%4);
    }
  })

  //un joueur a pris le pli
  socket.on('plireleve',()=>{
    socket.broadcast.emit('relevezpli');
    var ramasseur=donne.ramasseur(pli);
    donne.ramasser(pli);
    pli=[-1,-1,-1,-1];
    if (donne.plis0.length + donne.plis1.length==32){
    /*  if (ramasseur%2==0){donne.compte[0]+=10} else {donne.compte[1]+=10};//10 de der
      donne.MAJcompte();
      if (donne.compte[(donne.contrat[3])%2>=donne.contrat[0]]){ //partie faite ou non. TODO: attention ce n'est pas des chiffres (parseInt(s,10)) et voir pour TA et SA
      switch (donne.contrat[2]){
        case "Coinché":
         score[(donne.contrat[3]%2)]+=donne.contrat[0]*2;
        break;



        points[(donne.contrat[3]%2)]+=donne.contrat
      }
      io.emit('scores',donne.contrat, donne.compte);//TODO: afficher les scores
      console.log("fin de donne",donne.contrat);*/
    } else {
      io.emit('atoidejouer',donne.alamain);
      console.log(donne.alamain);
    }
  })

  //un joueur a validé la donne Suivante
  socket.on('donneSuivante',()=>{
    flagDonneSuivante++;
    if (flagDonneSuivante==4){
      //nouvelle donne. TODO: gérer la fin de manche.
      jeu.liste=Array.prototype.push.apply(donne.plis0, donne.plis1);//on refait le jeu
      jeu.couper();
      nouveaudonneur=(donne.donneur+1)%4;
      donne=new Donne(nouveaudonneur);
      donne.distribuer(jeu);
      io.emit('debutDeDonne',nouveaudonneur);
    }
  })

});

//lancement du serveur sur le port 3000
http.listen(3000);


//***Routines du jeu***


//constructeur tas de cartes mélangé et méthode de coupe
function Jeu(){
  var jeu=new Array(); //creation du jeu (liste de cartes)
  //Associer les 32 cartes
  for (let i=0;i<couleurs.length;i++){
    for (let j=0;j<valeurs.length;j++){
      var carte={valeur:valeurs[j], couleur:couleurs[i]};
      jeu.push(carte);
    }
  }
  //Mélanger le jeu
  function melanger(){
    j=this.liste;
    for (let i = j.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [j[i], j[k]] = [j[k], jeu[i]];
    }
    this.liste=j;
  }
  //Couper le jeu
  function couper(){
    j=this.liste;
    const r=Math.floor(Math.random() * 32);
    var res=[];
    for (let i=0;i<j.length;i++){
      res[i]=j[(i+r)%32];
    }
    this.liste=res;
  }

  this.liste=jeu;
  this.melanger=melanger;
  this.couper=couper;

}

//constructeur donne de 4 joueurs et un donneur
function Donne(donneur){
  //Distribuer les cartes aux joueurs
  function distribuer(jeu){
    jeu.couper;
    var j=jeu.liste;
    for (let i=0;i<4;i++){
        this["main"+(this.donneur+i+1)%4].push(j[3*i],j[3*i+1],j[3*i+2]);
        this["main"+(this.donneur+i+1)%4].push(j[3*i+12],j[3*i+13],j[3*i+14]);
        this["main"+(this.donneur+i+1)%4].push(j[2*i+24],j[2*i+25]);
    }
  }
  //Calcul le ramasseur d'un pli -> pour fonction ramasser
  function ramasseur(pli){
    var noOuvreur=this.alamain;
    var contrat=this.contrat;
    var tab=[this.main0[pli[0]],this.main1[pli[1]],this.main2[pli[2]],this.main3[pli[3]]];
    const ordreCouleur=["7","8","9","jack","queen","king","10","1"];
    const ordreAtout=["7","8","queen","king","10","1","9","jack"];
    atout=contrat[1];
    couleurDemande=tab[noOuvreur].couleur;
    score=[0,0,0,0];
    for (let i=0;i<4;i++){
      switch (atout){
        case "SA":
          if (tab[i].couleur==couleurDemande){
            score[i]=1+ordreCouleur.indexOf(tab[i].valeur);
          }
        break;
        case "TA":
        if (tab[i].couleur==couleurDemande){
          score[i]=1+ordreAtout.indexOf(tab[i].valeur);
        }
        break;
        default:
          switch (tab[i].couleur){
          case atout:
            score[i]=9+ordreAtout.indexOf(tab[i].valeur);
            break;
          case couleurDemande:
            score[i]=1+ordreCouleur.indexOf(tab[i].valeur);
            break;
          }
        break;
      }
    }
    return score.indexOf(Math.max(...score));//retourne l'indice du plus grand
  }
  //ramasser un pli (no de carte de chaque main dans un tableau de 4 indices,  on remplit le pli pour le ramasseur)
  function ramasser(pli){
    ram=this.ramasseur(pli);
    for (let i=0;i<4;i++){
      this["plis"+(ram)%2].push(this['main'+i][pli[i]]); //range le pli
    }
    this.alamain=ram;//on donne la main au preneur
  }
  //chercher la belote et mettre à jour le compte
  function isBelote(){
    for (let j=0;j<4;j=j+2){
      var res=0;
      var main=this['main'+((this.contrat[3]+j) %4)];
      for (let i=0;i<main.length;i++){
        if ((main[i].couleur==this.contrat[1])&&(main[i].valeur=='king')){res++};
        if ((main[i].couleur==this.contrat[1])&&(main[i].valeur=='queen')){res++};
      }
      if (res==2){this.compte[(this.contrat[3] %2)]+=20};
    }
  }

  //compte les points des plis
  function MAJcompte(){
    for (let i=0;i<2;i++){
      for (let j=0;j<this['plis'+i].length;j++){
        carte=this['plis'+i][j];
        switch(carte.valeur){
          case "jack":
          if ((this.contrat[1]=="TA")||(carte.couleur==this.contrat[1])){
            this.compte[i]+=20;
          } else {
            this.compte[i]+=2;
          }
          break;
          case "9":
          if ((this.contrat[1]=="TA")||(carte.couleur==this.contrat[1])){
            this.compte[i]+=14;
          }
          break;
          case "1":
          this.compte[i]+=11;
          break;
          case "10":
          this.compte[i]+=10;
          break;
          case "king":
          this.compte[i]+=4;
          break;
          case "queen":
          this.compte[i]+=3;
          break;
        }
      }
    }
  }
  //définition des propriétés
  this.main0 = [];
  this.main1 = [];
  this.main2 = [];
  this.main3 = [];
  this.plis0 = [];//plis de l'équipe 0/2
  this.plis1 = [];//plis de l'équipe 1/3
  this.compte=[0,0];//comptes des équipes
  this.isBelote=isBelote;
  this.contrat = ["","","",-1];//score, couleur, coinche, numéro du preneur
  this.donneur = donneur;
  this.alamain = (donneur+1)%4;//dans le pli en cours
  this.distribuer = distribuer;
  this.ramasseur = ramasseur;
  this.ramasser = ramasser;//prend un tableau avec les 4 indices des cartes jouées
  this.MAJcompte=MAJcompte;
}
