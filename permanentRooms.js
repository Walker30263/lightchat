const fs = require("fs");

module.exports = function(socket) {
  socket.on("makePermanentPublicRoom", (roomName, username) => {
    fs.appendFile(__dirname + "/permanentRoomData/" + roomName.split(' ').join('') + ".txt", "Welcome " + username + "\n", (err, data) => {
      if (err) {
        console.error(err);
      }
      
      console.log(data);
      socket.emit("redirectToRoom", roomName.split(' ').join(''))
    });
  });
}