//Constructeur du paquet de cartes
function Paquet() {

    function initPaquet(){
        //Construction du jeu de carte
        var cartes=new Array();
        const couleurs=["spade","heart","diamond","club"];
        const valeurs=["1","king","queen","jack","10","9","8","7"];
        //Associer les 32 cartes
        for (let i=0;i<couleurs.length;i++){
        for (let j=0;j<valeurs.length;j++){
            var carte={valeur:valeurs[j], couleur:couleurs[i]};
            cartes.push(carte);
        }
        }
    
        //Mélanger
        for (let i = cartes.length - 1; i > 0; i--) {
        let k = Math.floor(Math.random() * (i + 1));
        [cartes[i], cartes[k]] = [cartes[k], cartes[i]];
        }

        return cartes;
    } 
    //Fonction de coupe du jeu
    function couper(){
      const r=Math.floor(Math.random() * 32);
      var res=new Array();
      for (let i=0;i<this.cartes.length;i++){
        res[i]=this.cartes[(i+r)%32];
      }
      this.cartes=res;
    }
  
    this.cartes=initPaquet();
    this.couper=couper;
  }
  
//constructeur de la donne
function Donne(paquet,donneur){
    //Distribuer les cartes aux joueurs
    function distribuer(paquet,donneur){
      paquet.couper();
      var j=paquet.cartes;
      var mains=[[],[],[],[]];
      for (let i=0;i<4;i++){
          mains[(donneur+i+1)%4].push(j[3*i],j[3*i+1],j[3*i+2],j[3*i+12],j[3*i+13],j[3*i+14],j[2*i+24],j[2*i+25]);
      }
      return mains;
    }
  
    //Met à jour le ramasseur du plis et range le pli dans plis
    function getRamasseur(){
      var noOuvreur=this.ramasseur;
      const ordreCouleur=["7","8","9","jack","queen","king","10","1"];
      const ordreAtout=["7","8","queen","king","10","1","9","jack"];
      let atout=this.contrat.couleur;
      let couleurDemande=this.pli[noOuvreur].couleur;
      let score=[0,0,0,0];
      for (let i=0;i<4;i++){
        switch (atout){
          case "SA":
            if (this.pli[i].couleur==couleurDemande){
              score[i]=1+ordreCouleur.indexOf(this.pli[i].valeur);
            }
          break;
          case "TA":
          if (this.pli[i].couleur==couleurDemande){
            score[i]=1+ordreAtout.indexOf(this.pli[i].valeur);
          }
          break;
          default:
            switch (this.pli[i].couleur){
            case atout:
              score[i]=9+ordreAtout.indexOf(this.pli[i].valeur);
              break;
            case couleurDemande:
              score[i]=1+ordreCouleur.indexOf(this.pli[i].valeur);
              break;
            }
          break;
        }
      }
      this.ramasseur=score.indexOf(Math.max(...score));//retourne l'indice du plus grand      
    }

    function ramassePli(){
      this.plis[this.ramasseur]=this.plis[this.ramasseur].concat(this.pli);
      this.pli=Array(4);
    }
  
    //chercher la belote et mettre à jour le flag
    function isBelote(){
      if (this.contrat.valeur=='Capot'||this.contrat.valeur=='Générale'){return};//pas de belote sur capots et générale
      for (let j=0;j<4;j=j+2){
        var res=0;
        var main=this.mains[((this.preneur+j) %4)];//main du preneur puis de son equipier
        for (let i=0;i<main.length;i++){
          if ((main[i].couleur==this.contrat.couleur)&&(main[i].valeur=='king')){res++};
          if ((main[i].couleur==this.contrat.couleur)&&(main[i].valeur=='queen')){res++};
        }
        this.flagbelote=(this.flagbelote||res==2);
      }
    }
    
    //chercher si il y a une etoile et renvoi [n,m]
    function isEtoile(){
      var res=[0,0];
      //on cherche la générale non annoncée
      for (let i=0;i<4;i++){
        if (this.plis[i].length==32){//le joueur i a || le joueur i  a fait une générale
          if (this.contrat.valeur!='Générale' || this.preneur!=i){//le joueur i n'a pas annoncé une générale ou n'est pas le preneur
              res[i%2]=1;
          }
        }
      }
  
      //on cherche le capot non annoncé de l'équipe 0
      if (this.plis[0].length +this.plis[2].length==32){//l'équipe 0 a fait un capot
        if ((this.contrat.valeur!='Générale' && this.contrat.valeur!='Capot')){//le contrat n'est ni une générale ni un capot
            res[0]=1;
          } else if (this.preneur==1 || this.preneur==3){//le preneur n'est pas 0 ni 2
            res[0]=1;
          }
      }
  
      //on cherche le capot non annoncé de l'équipe 1
      if (this.plis[1].length +this.plis[3].length==32){//l'équipe 0 a fait un capot
        if ((this.contrat.valeur!='Générale' && this.contrat.valeur!='Capot')){//le contrat n'est ni une générale ni un capot
            res[1]=1;
          } else if (this.preneur==0 || this.preneur==2){//le preneur n'est pas 0 ni 2
            res[1]=1;
          }
      }
  
      return res;
    }
  
    //met à jour points faits et retourne points à marquer (à mettre dans score)
    function MAJcomptes(){
      
        //sous-fonction pour compter les points d'un tableau
        function compte(tab,contrat){
            res=0;
            for (let i=0;i<tab.length;i++){
              carte=tab[i];
              switch(carte.valeur){
                case "jack":
                if ((contrat.couleur=="TA")||(carte.couleur==contrat.couleur)){
                  res+=20;
                } else {
                  res+=2;
                }
                break;
                case "9":
                if ((contrat.couleur=="TA")||(carte.couleur==contrat.couleur)){
                  res+=14;
                }
                break;
                case "1":
                res+=11;
                break;
                case "10":
                res+=10;
                break;
                case "king":
                res+=4;
                break;
                case "queen":
                res+=3;
                break;
              }
            }
            return res;
        }
      
    //Calcul du compte des plis des attaquants
     var res=0;
     if (this.flagbelote){res+=20}; //on compte la belote
     if ((this.ramasseur%2)==(this.preneur%2)){res+=10};// on compte le 10 de der
     res+=compte(this.plis[this.preneur],this.contrat);
     res+=compte(this.plis[(this.preneur+2)%4],this.contrat);
  
     //Points à marquer
     var compteur=[0,0];//score de l'équipe qui marque
     switch (this.contrat.valeur){
       case 'Générale':
       if (this.plis[this.preneur].length==32){
         compteur[this.preneur %2]=500;
       } else {
         compteur[(this.preneur+1)%2]=160;
       }
       break;
       case 'Capot':
       if (this.plis[this.preneur].length+this.plis[(this.preneur+2)%4].length==32){
         compteur[this.preneur %2]=250;
       } else {
         compteur[(this.preneur +1)%2]=160;
       }
       break;
       default:
       var valcontrat=parseInt(this.contrat.valeur,10);
       if (res>=valcontrat){
         compteur[this.preneur %2]=valcontrat;
       } else {
         compteur[(this.preneur +1)%2]=160;
       }
       break;
     }
     if (this.contrat.coinche=="Coinché"){compteur=compteur.map(n=>2*n)};
     if (this.contrat.coinche=="Surcoinché"){compteur=compteur.map(n=>4*n)};
  
     this.pointsfaits=res;
     return compteur;
    }
  
    //définition des fonctions
    this.ramassePli = ramassePli;
    this.getRamasseur=getRamasseur;
    this.isBelote = isBelote;
    this.MAJcomptes =MAJcomptes;
    this.isEtoile=isEtoile;
  
  
    //Définitions des variables
    this.pli=Array(4);//Pli en cours
    this.preneur;//du contrat
    this.contrat;
    this.plis=[[],[],[],[]];//plis de chaque joueur
    this.flagbelote;
    this.ramasseur = (donneur+1)%4;//Dernier a avoir fait un pli
    this.mains=distribuer(paquet,donneur);
    this.pointsfaits=0;
  }
  
  module.exports={Donne,Paquet};