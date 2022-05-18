var http = require('http');
var cors = require('cors')
var express = require('express');
var fs = require('fs')
var {RtcTokenBuilder,  RtcRole} = require('agora-access-token')



var PORT = 8000;

var app = express();
app.set('port', PORT);
app.use(cors()) 

var server = http.createServer(app)

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
});



var appID = "082bf9c5c9784417a42eade29b414af8";
var appCertificate = "07e8f0230cdf4dcd855262fce73eeeb4";
var expirationTimeInSeconds = 3600
var role = RtcRole.PUBLISHER


const users = {}

io.on('connection', socket => {
  socket.on('new-user', name => {
    users[socket.id] = name
    socket.broadcast.emit('user-connected', name)
  })
  socket.on('send-chat-message', message   => {
    socket.broadcast.emit('chat-message', { message: message, name: users[socket.id] })
  })
  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', users[socket.id])
    delete users[socket.id]
  })
})

var generateRtcToken = function(req, resp) {
  var currentTimestamp = Math.floor(Date.now() / 1000)
  var privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
  var channelName = req.query.channelName;
  // use 0 if uid is not specified
  var uid = req.query.uid || 0

  if (!channelName) {
      return resp.status(400).json({ 'error': 'channel name is required' }).send();
  }
  var key = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName,uid, role, privilegeExpiredTs);
      console.log(key);
  return resp.json({ 'key': key }).send();
};

app.get('/rtcToken', generateRtcToken);
server.listen(app.get('port'), function() {
  console.log('AgoraSignServer starts at ' + app.get('port'));
});

