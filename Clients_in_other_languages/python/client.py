import socketio

sio = socketio.Client()

@sio.event
def connect():
    print("connected to localhost")
sio.connect("http://localhost:3001")
while True:
    print("index:")
    index = int(input())
    print("x:")
    x = int(input())
    print("y:")
    y = int(input())
    print("type:")
    type_piece =int(input())
    sio.emit("move piece",({'index':index,'x':x,'y':y},type_piece))

