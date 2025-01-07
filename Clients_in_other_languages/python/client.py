import socketio

sio = socketio.Client()

@sio.event
def connect():
    print("connected from python")
    sio.emit("move piece",({'index':40,'x':1,'y':4},0))

sio.connect("http://localhost:3001")
