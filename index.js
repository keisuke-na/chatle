var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(80); // WARNING: app.listen(80) will NOT work here!
console.log('server is running')

//Contains key-value pairs of data submitted in the request body.
app.use(express.json());
app.use(express.urlencoded({ extended: true}))
//Template engine for plane html is pug.
app.set('view engine', 'pug')


/* ROUTING
 * Can access these path is,
 * INDEX: '/'
 * ROOM: '/room/{number of three digit}' //use this for difining socke.join('room')
 * OTHER: response 404 status.
 */

var room_path = '/room'
// Room = { < number > { name: '', member: '' }}
var Room = {}
// Member = { < socket.id >: < room_id > }
var Member = {}
var total_member = 0

String.prototype.inspection = function(atr, callback) {
  if( this.length >= atr.limit_length || atr.regexp.test(this)) {
    console.log('if statement in String.inspection')
    if(callback) return callback(false)
  }

  if(callback) return callback(true)
}

app.get('/', function (req, res) {
  res.render('index', { title: 'Hey', message: 'Hello', Room: Room, total_member: total_member })
})
app.post('/create_room', function (req, res) {
  let room = {
    name: req.body.room_name,
    id: Date.now(),
  }

  room.name.inspection({ limit_length: '80', regexp: /^\ *$|^$/ }, (boolean) => {
    if(boolean) {
      Room[room.id] = { name: room.name, member: 0 }
      console.log('Room is ' + Room)
      console.log(Object.keys(Room))
      res.redirect(room_path + '/' + room.id)
    }else{
      res.redirect('/')
    }
  })

})
app.get('/room/:room_id', function (req, res) {
  let room_id = req.params.room_id
  if(!Object.keys(Room).includes(room_id)) {
    res.status(404).send("Sorry cant't find that <a href='/'>chatle.net</a>")
    return
  }
  Room[room_id].member++
  console.log('this is Room object after incliment mumber => ')
  console.log(Room)
  res.render('chat_for_room', { title: 'Hey', message: 'Hello', room_id: room_id, room_name: Room[room_id].name})

  total_member++
})
app.use(function(req, res) {
  res.status(404).send("Sorry cant't find that <a href='/'>chatle.net</a>")
})


/* CODE OF SOCKET CONNECTION */

/* MANEGE MESSAGE FROM CLIENT 
 *
 * Message can send to the other socket,
 * if it hasn't blank* and over 80 strings,
 * the system send to own socket.
 * 
 * DATA OF MESSAGE IS MANAGED BY OBJECT CALLED 'data'.
 * 
 * data {
 *  name: '',
 *  message: '',
 *  room_number: ''
 * }
 * Client has the same object like this called 'message_object' also.
 * 
 */

var regex_object_for_message = new RegExp('^\ *$|^$');
var limit_length_of_message = 80;


io.on('connection', function (socket) {
  //FIRST, Join the room from getting data of sending from client using by 'data'.
  socket.on('join_room', function(data) {
    socket.join(data.room_id)
    Member[socket.id] = data.room_id
    let message = {
      message: 'Someone enters the room.'
    }
    socket.to(data.room_id).emit('message', message)
  });

  //SECOND, The system wait a message(object) from client and response giving message to the other socket.
  socket.on('message', function (data) {
    data.message.inspection({ limit_length: '80', regexp: /^\ *$|^$/ }, (boolean) => {
      if(boolean){
        /* 
         * The not bas message sent to all socket in the room.
         */
        console.log('true')
        data.message += '@[' + data.name + ']' + socket.id
        io.to(data.room_id).emit('message', data)
      }else{
        console.log('false')
        data.message += '@[' + data.name + ']' + socket.id
        io.to(socket.id).emit('message', data) // send a not good message to the own socket.
      }
    })
  });

  //MANAGE SOCKET 'DISCONECTION'
  socket.on('disconnect', function(data) {
    let room_id = Member[socket.id]
    Room[room_id].member--
    total_member--
    delete Member[socket.id]

    let message = {
      message: 'Someone exits the room.'
    }
    socket.to(room_id).emit('message', message)

    if (Room[room_id].member == 0) delete Room[room_id]
    console.log('console.log of disconnection' + total_member)
  });
});