import socketio
import time 
from numpy import random 

sio = socketio.Client()

black_moves = [
    # Black piece 42 moves (starts at x:2, y:5)
    {'index': 42, 'x': 3, 'y': 4,'king':False},  # First diagonal move
    {'index': 42, 'x': 4, 'y': 3,'king':False},  # Advances further
    {'index': 42, 'x': 2, 'y': 1,'king':False},  # Captures white piece
    # Black piece 44 moves (star,'king':Falsets at x:4, y:5)
    {'index': 44, 'x': 3, 'y': 4,'king':False},  # Moves to support
    {'index': 44, 'x': 2, 'y': 3,'king':False},  # Continues advance
    {'index': 44, 'x': 0, 'y': 1,'king':False},  # Captures white piece
    # Black piece 51 moves (star,'king':Falsets at x:3, y:6)
    {'index': 51, 'x': 4, 'y': 5,'king':False},  # Moves forward
    {'index': 51, 'x': 5, 'y': 4,'king':False},  # Sets up for capture
    {'index': 51, 'x': 3, 'y': 2,'king':False}   # Makes a capture
]
white_moves = [                 
    # White piece 17 moves (star,'king':Falsets at x:1, y:2)
    {'index': 17, 'x': 2, 'y': 3,'king':False},  # Tries to block
    {'index': 17, 'x': 3, 'y': 4,'king':False},  # Moves away from threat
    # White piece 19 moves (star,'king':Falsets at x:3, y:2)
    {'index': 19, 'x': 4, 'y': 3,'king':False},  # Defensive move
    {'index': 19, 'x': 5, 'y': 4,'king':False},  # Tries to escape
    # White piece 12 moves (star,'king':Falsets at x:4, y:1)
    {'index': 12, 'x': 3, 'y': 2,'king':False},  # Repositions
    {'index': 12, 'x': 2, 'y': 3,'king':False},  # Defensive stance
    # White piece 21 moves (star,'king':Falsets at x:5, y:2)
    {'index': 21, 'x': 4, 'y': 3,'king':False},  # Support move
    {'index': 21, 'x': 3, 'y': 4,'king':False}   # Final defensive position
]

@sio.on("rooms")
def Handlerooms(emptyRooms,fullRooms):
    print("empty rooms are ",fullRooms)
    print("full rooms are ",emptyRooms)

@sio.on("msg")
def handleMsg(msg):
    print(msg)

@sio.on("U're Turn")
def handleMsg():
    print("My turn bitches")

@sio.on("Start Game")
def StartGame():
    print("Start Game")
    while True:
        for i in range(len(black_moves)-1):
            print("black move",black_moves[i])
            sio.emit("move piece",(black_moves[i],0,random.randint(10)))
            time.sleep(0.5)
            print("white move",white_moves[i])
            sio.emit("move piece",(white_moves[i],1,random.randint(10)))
            time.sleep(0.5)
        break


@sio.event
def connect():
    print("connected to localhost")

sio.connect("https://hagfish-witty-roughly.ngrok-free.app/")
time.sleep(0.5)
print("------Play as :\n0:Black\n1:White")
choise_type= int(input())
print("------Join or Create Room:------\n0:Create room : \n1:Join Room :")
choise_room= int(input())
match choise_room:
    case 0:
        print("Enter room number:")
        room_number= int(input())
        sio.emit("create room",room_number)
    case 1 :
        print("Enter room number:")
        room_number= int(input())
        print("join as spectator or player?:\n0:Player:\n1:Spectator")
        player_or_spectator= int(input())
        match player_or_spectator:
            case 0:
                sio.emit("join room as player",room_number)
            case 1:
                sio.emit("join room as spectator",room_number)
sio.wait()
