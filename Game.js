var {Donne,Paquet}=require("./Modules.js");

module.exports=function Game(){

    function redonner(){
        this.donneur=(this.donneur+1)%4;
        this.paquet=new Paquet();
        this.donne=new Donne(this.paquet,this.donneur);
    }

    function debuterLaDonne(preneur,contrat){
        this.donne.contrat=contrat;
        this.donne.preneur=preneur;
        this.donne.ramasseur=(this.donne.contrat.valeur=='Générale' ? this.donne.preneur : (this.donneur+1)%4);
        this.donne.isBelote();
    }

    //retourne l'état (carteSuivante, pliSuivant, donneSuivante) et le joueur suivant
    function jouerCarte(carte,no){
      this.donne.pli[no]=carte;
      //Recherche de l'indice de la carte à enlever de la main
      var indice=-1;
      var main=this.donne.mains[no];
      for (let i=0;i<main.length;i++){
        if (main[i].valeur==carte.valeur && main[i].couleur==carte.couleur){indice=i}
      }
      this.donne.mains[no].splice(indice,1);
      //Vérif de la fin de pli (la tableau pli est plein)
      if (this.donne.pli.includes(undefined)){
        return ['carteSuivante',(no+1)%4];
      } else {
        //on vérifie si les mains sont vides-> fin de donne
        if (this.donne.mains.every(main=>main.length==0)){
          return ['donneSuivante',null] ;
        } else {
          this.donne.getRamasseur();
          return ['pliSuivant',this.donne.ramasseur]}
      }
    }

    function finDePli(){
      this.donne.ramassepli();
    }

    function finDeDonne(){
      if (this.scores[0]>=1000 || this.scores[1]>=1000) {this.scores=[0,0]};
      var resultat=this.donne.MAJcomptes();
      this.scores[0]+=resultat[0];
      this.scores[1]+=resultat[1];
      var etoile=this.donne.isEtoile();
      this.etoiles[0]+=etoile[0];
      this.etoiles[1]+=etoile[1];
    }

    function nouvelleDonne(){
      this.donneur=(this.donneur+1)%4;
      this.paquet.cartes=this.donne.plis[0].concat(this.donne.plis[1],this.donne.plis[2],this.donne.plis[3]);
      this.paquet.couper();
      this.donne=new Donne(this.paquet,this.donneur);
    }
      
      //fonctions du jeu
  this.redonner=redonner;
  this.debuterLaDonne=debuterLaDonne;
  this.jouerCarte=jouerCarte;
  this.finDePli=finDePli;
  this.finDeDonne=finDeDonne;
  this.nouvelleDonne=nouvelleDonne;

  //données du jeu
  this.donneur=0;
  this.scores=[0,0];
  this.etoiles=[0,0];
  this.paquet=new Paquet();
  this.donne=new Donne(this.paquet,this.donneur);
}