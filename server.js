const express = require("express");
const app = express();

const htmlNameArrays = require("./htmlNameArrays.js")

const colorNamesArray = htmlNameArrays.CSS_COLOR_NAMES;

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);

const { Webhook, MessageBuilder } = require('discord-webhook-node');
const hook = new Webhook(process.env.W_ID_DISCORD); //uses a Discord webhook to send suggestions to the developers
//if you're recreating this, put the webhook link instead of "process.env.W_ID_DISCORD", or make a .env with W_ID_DISCORD set to the link

app.use(express.static("public"));

//Each Room is an array of Members
var rooms = []; //Array of Rooms
var roomNames = []; //Array of Room Names
var roomPasswords = []; //Array of Room Passwords
var roomInviteCodes = []; //parallel array to hold room invites

var publicRooms = []; //Array of Public Room Names for display purposes


//Defining what a "Member" of a room is:
//A member has a userid, username, and username color
let Member = class {
  constructor(userid, username) {
    this.id = userid;
    this.username = username;
    this.usernameColor = "#ffffff";
  }
}

var uptime = 0;

setInterval(function() {
  uptime++;
  console.log("Up for " + uptime + " minutes.")
}, 60000);


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/suggestions', (req, res) => {
  res.sendFile(__dirname + '/views/suggestions.html');
});

app.get('/invite', (req, res) => {
  res.redirect("/")
});

app.use('/invite/:code', (req, res) => {
  res.redirect("/?inviteCode=" + req.params.code);
});

app.get('/games', (req, res) => {
  res.sendFile(__dirname + '/views/games/games.html')
});

// this was moved here since defining it every time somebody types !help is a waste of resources

const help_message = `
<table>
<tr>
<th>Name</th>
<th>Description</th>
<th>Example</th>
</tr>
<tr>
<td>!help</td>
<td>View Commands</td>
<td>!help</td>
</tr>
<tr>
<td>!setUsername</td>
<td>Sets Username</td>
<td>!setUsername username</td>
</tr>
<tr>
<td>!invite</td>
<td>Gives you an invite link to the current chat room</td>
<td>!invite</td>
</tr>
<tr>
<td>!users</td>
<td>User Count</td>
<td>!users</td>
</tr>
<tr>
<td>!color</td>
<td>Color your message</td>
<td>!color #00ff00 This message is green!</td>
</tr>
<tr>
<td>!setColor</td>
<td>Sets Username Color</td>
<td>!setColor crimson</td>
</tr>
<tr>
<td>!notifs</td>
<td>Toggles notifs on and off</td>
<td>!notifs</td>
</tr>
</table>
`;

io.on('connection', (socket) => {
  console.log("An user connected!");
  
  socket.on('joinRoom', (joiningRoomName, joiningRoomCode, username) => {
    if (verifyRoomPassword(joiningRoomName, joiningRoomCode)) {
       io.to(socket.id).emit("removeOtherElements");
      let joiner = new Member(socket.id, username);
      rooms[roomNames.indexOf(joiningRoomName)].push(joiner);
      
      socket.join(joiningRoomName);
      
      io.to(joiningRoomName).emit("welcomeMessage", getUsername(socket.id))
      io.to(socket.id).emit("changeTitle", joiningRoomName)
    }
    else {
      io.to(socket.id).emit("errorAlert", "Wrong room name or password. Please try again.")
    }
  });
  
  socket.on("joinRoomWithInvite", (inviteCode, username) => {
    var index = roomInviteCodes.indexOf(inviteCode);
    var joiningRoomName = roomNames[index];
    
    io.to(socket.id).emit("removeOtherElements");
    let joiner = new Member(socket.id, username);
    
    rooms[roomNames.indexOf(joiningRoomName)].push(joiner);
      
    socket.join(joiningRoomName);
      
    io.to(joiningRoomName).emit("welcomeMessage", getUsername(socket.id))
    io.to(socket.id).emit("changeTitle", joiningRoomName)
  })
  
  socket.on("makeRoom", (roomName, roomPassword, username) => {
    if (roomNames.includes(roomName)) {
      io.to(socket.id).emit("errorAlert", "A room with that name already exists. Pick a new name.")
      return;
    } else if (!roomName) {
      io.to(socket.id).emit("errorAlert", "Empty Room Names are not allowed.")
      return;
    }
    else if (!roomPassword) {
      io.to(socket.id).emit("errorAlert", "Enter a password. If you don't want to make a room with a password, make a public room.")
      return;
    }
    
    let owner = new Member(socket.id, username);
    
    rooms.push([owner]);
    roomNames.push(roomName);
    roomPasswords.push(roomPassword);
    roomInviteCodes.push(generateInviteCode());
    
    socket.join(roomName);
    
    io.to(socket.id).emit("removeOtherElements");
    io.to(socket.id).emit("changeTitle", roomName);
    io.to(roomName).emit("welcomeMessage", getUsername(socket.id));
  });
  
  socket.on("makePublicRoom", (roomName, username) => {
    if (roomNames.includes(roomName)) {
      io.to(socket.id).emit("errorAlert", "A room with that name already exists. Pick a new name.")
      return;
    } else if (!roomName) {
      io.to(socket.id).emit("errorAlert", "Empty Room Names are not allowed")
      return;
    }
    
    let owner = new Member(socket.id, username);
    
    rooms.push([owner]);
    roomNames.push(roomName);
    roomPasswords.push("publicRoom")
    roomInviteCodes.push(generateInviteCode());
    
    publicRooms.push(roomName);
    
    socket.join(roomName);
    io.to(socket.id).emit("removeOtherElements");
    io.to(socket.id).emit("changeTitle", roomName)
    io.to(roomName).emit("welcomeMessage", getUsername(socket.id));
    io.emit("addRoomToList", roomName);
  });
  
  socket.on("newMessage", (message, content) => {
    const currentRoom = getRoomName(socket.id);
    const message_words = message.split(" ");
    const first_word_in_message = message_words[0];
    
    
      switch (first_word_in_message) {
        case "!setUsername":
          const oldUsername = getUsername(socket.id);
          const newUsername = message
            .split(" ")
            .slice(1)
            .join(" ");
          changeUsername(socket.id, newUsername);
          io.to(currentRoom).emit("systemMessage", {
            command: "!setUsername",
            data: {
              newUsername: newUsername,
              oldUsername: oldUsername
            }
          })
          break;
        case "!invite":
          if (publicRooms.includes(currentRoom)) {
            io.to(currentRoom).emit(
              "systemMessage",
              {
                command: "!invite",
                data: {
                  username: getUsername(socket.id),
                  currentRoom: currentRoom,
                  inviteLink: getInviteLinkFromRoomName(currentRoom),
                  public: true
                }
              }
            );
          } else if (
            publicRooms.includes(currentRoom) == false &&
            roomNames.includes(currentRoom) == true
          ) {
            io.to(currentRoom).emit(
              "systemMessage",
              {
                command: "!invite",
                data: {
                  username: getUsername(socket.id),
                  currentRoom: currentRoom,
                  inviteLink: getInviteLinkFromRoomName(currentRoom),
                  public: false
                }
              }
            );
          }
          break;
        case "!users":
          io.to(currentRoom).emit(
            "systemMessage",
            {
              command: "!users",
              data: {
                username: getUsername(socket.id),
                onlineUsers: getOnlineUsers(currentRoom),
                onlineUsersNames: getOnlineUsersNames(currentRoom).join(", ")
              }
            }
          );
          break;
        case "!color":
          if (fixColor(message_words[1]) == false) {
            io.to(socket.id).emit(
              "systemMessage", {
                command: "!color",
                data: {
                  failed: true
                }
              }
            );
          } else {
            io.to(currentRoom).emit(
              "newMessage",
              message_words.slice(2).join(" "), {
                usernameColor: getUsernameColor(socket.id),
                username: getUsername(socket.id),
                messageColor: fixColor(message_words[1])
              }
            );
          }
          break;
        case "!setColor":
          var newColor = message_words[1];
          if (fixColor(newColor) == false) {
            io.to(socket.id).emit(
              "systemMessage",
              {
                command: "!setColor",
                data: {
                  username: getUsername(socket.id),
                  newColor: fixColor(newColor),
                  failed: true
                }
              }
            );
          } else {
            changeUsernameColor(socket.id, fixColor(newColor));
            io.to(currentRoom).emit(
              "systemMessage", {
                command: "!setColor",
                data: {
                  username: getUsername(socket.id),
                  newColor: fixColor(newColor),
                  failed: false
                }
              }
            );
          }
          break;
        case "!help":
          io.to(currentRoom).emit(
            "systemMessage",
            {
              command: "!help",
              data: {
                username: getUsername(socket.id),
                helpMessage: help_message
              } 
            }
          );
          break;
        default:
          io.to(currentRoom).emit("newMessage", message, {
            usernameColor: getUsernameColor(socket.id),
            username: getUsername(socket.id),
            messageColor: "#fff"
          });
          break;
      }
    socket.to(currentRoom).emit("ping");
  });
  
  socket.on('disconnect', () => {
    const currentRoom = getRoomName(socket.id);
    io.to(currentRoom).emit("systemMessage", {
      command: "disconnect",
      data: {
        username: getUsername(socket.id)
      }
    })
    removeFromRoom(socket.id);
    if (getOnlineUsers(currentRoom) == 0) {
      deleteRoom(currentRoom);
    }
    io.emit("getPublicRooms")
  });
  
  socket.on("getPublicRooms", () => {
    publicRooms.forEach(rn => {
      socket.emit("addRoomToList", rn, getOnlineUsers(rn));
    });
  });
  
  socket.on("getRoomNameFromInvite", (inviteCode) => {
    var index = roomInviteCodes.indexOf(inviteCode);
    socket.emit("outputRoomNameFromInvite", roomNames[index]);
  });
  
  socket.on("suggestion", (contact, suggestion) => {
    const embed = new MessageBuilder()
      .setTitle("New Suggestion")
      .setColor("#FF00FF")
      .addField("Contact method:", contact)
      .addField("Suggestion: ", suggestion)
      .setTimestamp();
    
    hook.send(embed);
  });
});

server.listen(process.env['PORT'], () => {
  console.log("Up!");
});


//Helper functions below:

function verifyRoomPassword(name, password) {
  if (password === roomPasswords[roomNames.indexOf(name)]) {
    return true
  }
  else {
    return false
  }
}

function getUsername(id) {
  for (var i = 0; i < rooms.length; i++) {
    for (var j = 0; j < rooms[i].length; j++) {
      if (rooms[i][j].id == id) {
        return rooms[i][j].username;
      }
    }
  } 
} 

function getUsernameColor(id) {
  for (var i = 0; i < rooms.length; i++) {
    for (var j = 0; j < rooms[i].length; j++) {
      if (rooms[i][j].id == id) {
        return rooms[i][j].usernameColor;
      }
    }
  }
}

function getRoomName(id) {
  for (var i = 0; i < rooms.length; i++) {
    for (var j = 0; j < rooms[i].length; j++) {
      if (rooms[i][j].id == id) {
        return roomNames[i];
      }
    }
  }
}

function changeUsername(id, newUsername) {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = 0; j < rooms[i].length; j++) {
      if (rooms[i][j].id == id) {
        rooms[i][j].username = newUsername;
      }
    }
  } 
}

function changeUsernameColor(id, newColor) {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = 0; j < rooms[i].length; j++) {
      if (rooms[i][j].id == id) {
        rooms[i][j].usernameColor = newColor;
      }
    }
  }
}

function getOnlineUsers(rn) {
  var index = roomNames.indexOf(rn);
  if (rooms[index]) {
    return rooms[index].length;
  }
}

function getOnlineUsersNames(rn) {
  var index = roomNames.indexOf(rn);
  var usernames = [];
  if (rooms[index]) {
    for (let i = 0; i < rooms[index].length; i++) {
      usernames.push(rooms[index][i].username);
    }
  }
  return usernames;
}

function removeFromRoom(id) {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = 0; j < rooms[i].length; j++) {
      if (rooms[i][j].id == id) {
        rooms[i].splice(j, 1);
      }
    }
  }
}

function deleteRoom(rn) {
  var index = roomNames.indexOf(rn); 
  var publicIndex = publicRooms.indexOf(rn);
  rooms.splice(index, 1);
  roomNames.splice(index, 1);
  roomPasswords.splice(index, 1);
  roomInviteCodes.splice(index, 1);
  
  publicRooms.splice(publicIndex, 1);
}

function fixColor(color) {
  const regex = new RegExp('^#(?:[0-9a-fA-F]{3}){1,2}$');
  if (colorNamesArray.includes(color.toLowerCase())) {
    return color;
  } else if (color.charAt(0) != "#") {
    var x = "#" + color
    if (regex.test(x)) {
      return x;
    }
    else {
      return false;
    }
  } else {
    if (regex.test(color)) {
      return color;
    }
    else {
      return false;
    }
  }
}

function generateInviteCode() {
  var code = "";
  for (let i = 0; i < 6; i++) {
    if (Math.random() > 0.5) {
      code += (Math.floor(Math.random()*9) + 1)
    } else {
      code += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
    }
  }
  if (roomInviteCodes.includes(code)) {
    generateInviteCode()
  } else {
    return code;
  }
}

function getInviteLinkFromRoomName(rn) {
  var index = roomNames.indexOf(rn);
  return "https://lightchat.ml/invite/" + roomInviteCodes[index];
}