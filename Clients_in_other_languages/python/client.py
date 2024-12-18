import socketio

sio = socketio.Client()

@sio.event
def connect():
    print("connected from python")
    sio.emit("message","hello from python")

sio.connect("http://localhost:3000")
