import socketio
import time 
from numpy import random 

sio = socketio.Client()

move = 0
choise_room = 0
room_number = 0
player_type = 1

black_moves = [
    # Black 42 (x=2, y=5) captures white 21 (x=5, y=2)
    {"index": 42, "x": 4, "y": 3, "king": False},  # Jump over white 21 (x=5, y=2)
    {"index": 42, "x": 6, "y": 1, "king": False},  # Jump over white 23 (x=7, y=2)
    {"index": 42, "x": 5, "y": 0, "king": True},   # King promotion

    # Black 40 (x=0, y=5) captures white 17 (x=1, y=2)
    {"index": 40, "x": 2, "y": 3, "king": False},  # Jump over white 17 (x=1, y=2)
    {"index": 40, "x": 4, "y": 1, "king": False},  # Jump over white 19 (x=3, y=2)
    {"index": 40, "x": 5, "y": 0, "king": True},   # King promotion

    # Black 51 (x=3, y=6) captures white 12 (x=4, y=1)
    {"index": 51, "x": 4, "y": 5, "king": False},  # Jump over white 12 (x=4, y=1)
    {"index": 51, "x": 6, "y": 3, "king": False},  # Jump over white 14 (x=6, y=1)
    {"index": 51, "x": 4, "y": 1, "king": True},   # King promotion

    # Black 42 (now king) captures white 10 (x=2, y=1)
    {"index": 42, "x": 6, "y": 1, "king": True},   # Jump over white 10 (x=2, y=1)

    # Black 40 (now king) captures white 8 (x=0, y=1)
    {"index": 40, "x": 2, "y": 1, "king": True},   # Jump over white 8 (x=0, y=1)

    # Black 51 (now king) captures white 1 (x=1, y=0)
    {"index": 51, "x": 0, "y": 3, "king": True},   # Jump over white 1 (x=1, y=0)

    # Black 51 captures white 3 (x=3, y=0)
    {"index": 51, "x": 2, "y": 5, "king": True},   # Jump over white 3 (x=3, y=0)

    # Black 42 captures white 5 (x=5, y=0)
    {"index": 42, "x": 3, "y": 4, "king": True},   # Jump over white 5 (x=5, y=0)

    # Black 40 captures white 7 (x=7, y=0)
    {"index": 40, "x": 7, "y": 6, "king": True},   # Jump over white 7 (x=7, y=0)
]

white_moves = [
    # Move white 17 (x=1, y=2) to (2, 3)
    {"index": 17, "x": 2, "y": 3, "king": False},

    # Move white 19 (x=3, y=2) to (4, 3)
    {"index": 19, "x": 4, "y": 3, "king": False},

    # Move white 21 (x=5, y=2) to (6, 3)
    {"index": 21, "x": 6, "y": 3, "king": False},

    # Move white 23 (x=7, y=2) to (6, 1)
    {"index": 23, "x": 6, "y": 1, "king": False},
]

@sio.on("rooms")
def Handlerooms(emptyRooms,fullRooms):
    print("empty rooms are ",emptyRooms)
    print("full rooms are ",fullRooms)

@sio.on("msg")
def handleMsg(msg):
    print(msg)

@sio.on("turn")
def turn():
    print("my turn bitch")
    time.sleep(5)
    global move
    match player_type:
        case 0:
            if move <= len(black_moves):
                sio.emit("move piece",(black_moves[move],player_type,random.randint(10)))
                print(len(black_moves))
                move+=1
        case 1:
            if move <= len(white_moves):
                sio.emit("move piece",(white_moves[move],player_type,random.randint(10)))
                print(len(white_moves))
                move+=1

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
    print("connected successfully")

sio.connect("http://localhost:3001")
time.sleep(0.5)
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
                player_type= 0
                sio.emit("join room as player",room_number)
            case 1:
                sio.emit("join room as spectator",room_number)
sio.wait()
