const express = require("express");
const app = express();

const htmlNameArrays = require("./htmlNameArrays.js")

const colorNamesArray = htmlNameArrays.CSS_COLOR_NAMES;
const htmlTagsArray = htmlNameArrays.HTML_TAG_LIST;

for (var i = 0; i < colorNamesArray.length; i++) {
  colorNamesArray[i] = colorNamesArray[i].toLowerCase(); //to make the array lowercase
}

for (var i = 0; i < htmlTagsArray.length; i++) {
  htmlTagsArray[i] = "<" + htmlTagsArray[i] + ">"
}

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);

const { Webhook, MessageBuilder } = require('discord-webhook-node');
const hook = new Webhook(process.env.W_ID_DISCORD); //uses a Discord webhook to send suggestions to the developers
//if you're recreating this, put the webhook link instead of "process.env.W_ID_DISCORD", or make a .env with W_ID_DISCORD set to the link

app.use(express.static("public"));

var rooms = []; //Array of Rooms
var roomNames = []; //Array of Room Names
var roomPasswords = []; //Array of Room Passwords
var roomInviteCodes = []; //parallel array to hold room invites

var publicRooms = []; //Array of Public Room Names for display purposes

//Each Room is an array of Members
let Member = class {
  constructor(userid, username) {
    this.id = userid;
    this.username = username;
    this.usernameColor = "#ffffff";
  }
}


var willThisWork = 0;

setInterval(function() {
  willThisWork++;
  console.log("Up for " + willThisWork + " seconds.")
}, 1000);


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
  console.log(req.params.code)
});

app.get('/games', (req, res) => {
  res.sendFile(__dirname + '/views/games/games.html')
});

io.on('connection', (socket) => {
  console.log("An user connected!");
  
  socket.on('joinRoom', (joiningRoomName, joiningRoomCode, username) => {
    console.log("Someone wants to join " + joiningRoomName + " with the password " + joiningRoomCode);
    if (verifyRoomPassword(joiningRoomName, joiningRoomCode)) {
       io.to(socket.id).emit("removeOtherElements");
      let joiner = new Member(socket.id, username);
      rooms[roomNames.indexOf(joiningRoomName)].push(joiner);
      
      socket.join(joiningRoomName);
      
      io.to(joiningRoomName).emit("systemMessage", "A new user connected. Welcome " + getUsername(socket.id) + "! You can do !setUsername (username) to set a username")
      io.to(socket.id).emit("changeTitle", joiningRoomName)
    }
    else {
      io.to(socket.id).emit("errorAlert", "Wrong room name or password. Please try again.")
    }
  });
  
  socket.on("joinRoomWithInvite", (inviteCode, username) => {
    console.log("Someone wants to join with the invite " + inviteCode);
    
    var index = roomInviteCodes.indexOf(inviteCode);
    var joiningRoomName = roomNames[index];
    
    io.to(socket.id).emit("removeOtherElements");
    let joiner = new Member(socket.id, username);
    
    rooms[roomNames.indexOf(joiningRoomName)].push(joiner);
      
    socket.join(joiningRoomName);
      
    io.to(joiningRoomName).emit("systemMessage", "A new user connected. Welcome " + getUsername(socket.id) + "! You can do !setUsername (username) to set a username.")
    io.to(socket.id).emit("changeTitle", joiningRoomName)
  })
  
  socket.on("makeRoom", (roomName, roomPassword, username) => {
    console.log("Someone wants to make a room with the name " + roomName + " and password " + roomPassword);
    
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
    io.to(roomName).emit("systemMessage", "Welcome " + getUsername(socket.id) + "! You can do !setUsername (username) to set a username. You can do !invite to get an invite link to share to your friends!");
  });
  
  socket.on("makePublicRoom", (roomName, username) => {
    console.log("Someone wants to make a public room with the name " + roomName);
    
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
    io.to(roomName).emit("systemMessage", "Welcome " + getUsername(socket.id) + "! You can do !setUsername (username) to set a username. You can do !invite to get an invite link to share to your friends!");
    io.emit("addRoomToList", roomName);
  });
  
  socket.on("newMessage", (message, content) => {
    const currentRoom = getRoomName(socket.id);
    
    const parts = message.split(" ");
    
    if (parts[0] == "!setUsername") {
      const oldUsername = getUsername(socket.id);
      const newUsername = message.split(" ").slice(1).join(" ");
      
      changeUsername(socket.id, newUsername);
      io.to(currentRoom).emit("systemMessage", oldUsername + " has changed their username to " + newUsername);
    } 
    else if (parts[0] == "!invite") {
      if (publicRooms.includes(currentRoom)) {
        io.to(currentRoom).emit("systemMessage", "Requested by " + usernameDisplay(socket.id) + ":<br>This is a public room with the name " + currentRoom + " and the invite link is " + getInviteLinkFromRoomName(currentRoom) + ".")
      } 
      else if ((publicRooms.includes(currentRoom) == false) && (roomNames.includes(currentRoom) == true)) {
        io.to(currentRoom).emit("systemMessage", "Requested by " + usernameDisplay(socket.id) + ":<br>The room name is " + currentRoom + " and the room's invite link is " + getInviteLinkFromRoomName(currentRoom))
      }
    }
    else if (parts[0] == "!users") {
      io.to(currentRoom).emit("systemMessage", "Requested by " + usernameDisplay(socket.id) + ":<br>There are " + getOnlineUsers(currentRoom) + " users on in this room.")
    }
    else if (parts[0] == "!color") {
      if (fixColor(parts[1]) == false) {
        io.to(socket.id).emit("systemMessage", "Invalid Hex color/color name")
      } else {
        io.to(currentRoom).emit("newMessage", usernameDisplay(socket.id) + ": " + "<span class='content' style='color: " + fixColor(parts[1]) + ";'><b>" + parts.slice(2).join(" ") + "</b></span>", parts.slice(2).join(" "));
      }
    } 
    else if (message.includes("<script>")) {
      io.to(currentRoom).emit("systemMessage", "<span style='color:red; font-weight:bold;'>" + getUsername(socket.id) + " Sent a message which contained the script tag</span>");
    } 
    /*else if (checkInputForHTML(parts)) {
      io.to(currentRoom).emit("systemMessage", "Stop trying to be cool and embed HTML into the chat, " + usernameDisplay(socket.id) + "!")
    }*/
    else if (parts[0] == "!getUsers") {
      io.to(currentRoom).emit("systemMessage", "The Users are: "+ getOnlineUsersNames(currentRoom).join(', '))
    }
    else if (parts[0] == "!setColor") {
      var newColor = parts[1];
      const regex = new RegExp('^#(?:[0-9a-fA-F]{3}){1,2}$');
      
      if (fixColor(newColor) == false) {
        io.to(socket.id).emit("systemMessage", "Invalid Hex color/color name");
      } else {
        changeUsernameColor(socket.id, fixColor(newColor));
        io.to(currentRoom).emit("systemMessage", getUsername(socket.id) + " changed their username color to " + fixColor(newColor));
      } 
    } 
    else if (parts[0] == "!help") {
      var returnval = `
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
            <td>!getUsers</td>
            <td>User List</td>
            <td>!getUsers</td>
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
        </table>
      `;
      
      io.to(currentRoom).emit("systemMessage", "Requested by " + usernameDisplay(socket.id) + ": <br>" + returnval);
    }
    else {
      var finalMessage = usernameDisplay(socket.id) + ": " + "<span class='content'>" + message + "</span>";
      io.to(currentRoom).emit("newMessage", finalMessage, message);
    }
    
    socket.to(currentRoom).emit("ping");
  });
  
  socket.on('disconnect', () => {
    const currentRoom = getRoomName(socket.id);
    io.to(currentRoom).emit("systemMessage", getUsername(socket.id) + " has disconnected.")
    removeFromRoom(socket.id);
    if (getOnlineUsers(currentRoom) == 0) {
      deleteRoom(currentRoom);
    }
    io.emit("getPublicRooms")
  });
  
  socket.on("displayRooms", () => {
    console.log(rooms);
    console.log(roomNames);
    console.log(roomPasswords);
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

server.listen(3000, () => {
  console.log("Listening on 3000");
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
  for (var i = 0; i < rooms.length; i++) {
    for (var j = 0; j < rooms[i].length; j++) {
      if (rooms[i][j].id == id) {
        rooms[i][j].username = newUsername;
      }
    }
  } 
}

function changeUsernameColor(id, newColor) {
  for (var i = 0; i < rooms.length; i++) {
    for (var j = 0; j < rooms[i].length; j++) {
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
    for (var i = 0; i < rooms[index].length; i++) {
      usernames.push(rooms[index][i].username);
    }
  }
  return usernames;
}

function removeFromRoom(id) {
  for (var i = 0; i < rooms.length; i++) {
    for (var j = 0; j < rooms[i].length; j++) {
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

function usernameDisplay(socketid) {
  return "<span class='name' style='color:" + getUsernameColor(socketid) + ";'>" + getUsername(socketid) + "</span>";
}

function checkInputForHTML(words) {
  for (i = 0; i < words.length; i++) {
    if (htmlTagsArray.includes(words[i])) {
      return true;
    }
  }
  return false;
}

function generateInviteCode() {
  var code = "";
  for (i = 0; i < 6; i++) {
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
  return "<a href='https://lightchat.tk/invite/" + roomInviteCodes[index] + "'>https://lightchat.tk/invite/" + roomInviteCodes[index] + "</a>";
}
