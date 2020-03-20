var $window = $(window);

var $loginPage = $('#loginpage'); // The login page
var $closePage = $('#closepage'); // The close page
var $mainPage = $('#mainpage');// The main page


// Prompt for setting a username
var username;
var connected = false;

var socket = io();//connection au socket

// Sets the client's username
const setUsername = () => {
  username = cleanInput($('#usernameInput').val().trim());

  // If the username is valid
  if (username) {
    $loginPage.hide();
    $mainPage.show();

    // Tell the server your username
    socket.emit('add user', username);
  }
}

// Prevents input from having injected markup
const cleanInput = (input) => {
  return $('<div/>').text(input).html();
}

//Click sur bouton de login
$('#Entrer').click(()=>{
  setUsername();
})
