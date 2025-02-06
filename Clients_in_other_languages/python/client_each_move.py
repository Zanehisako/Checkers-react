import socketio
import time 
from numpy import random 

sio = socketio.Client()

choise_room = 0
player_type = 1


@sio.on("rooms")
def Handlerooms(emptyRooms,fullRooms):
    print("empty rooms are ",emptyRooms)
    print("full rooms are ",fullRooms)

@sio.on("msg")
def handleMsg(msg):
    print(msg)

@sio.on("turn")
def turn():
    match player_type:
        case 0:
            index = input("Enter Index:\n").strip()
            position_details = list(map(int,input("Enter Position:\n").split()))
            sio.emit("move piece",({"index":index,"x":position_details[0],"y":position_details[1],"king":False},player_type,random.randint(10)))
        case 1:
            index = input("Enter Index:\n").strip()
            position_details = list(map(int,input("Enter Position:\n").split()))
            sio.emit("move piece",({"index":index,"x":position_details[0],"y":position_details[1],"king":False},player_type,random.randint(10)))

@sio.event
def connect():
    print("connected successfully")

sio.connect("http://localhost:3001")
time.sleep(0.5)
print("------Join or Create Room:------\n0:Create room : \n1:Join Room :")
choise_room= int(input())
match choise_room:
    case 0:
        print("Enter room name :")
        room_name= input().strip()
        sio.emit("create room",room_name)
    case 1 :
        print("Enter room name:")
        room_name= input().strip()
        print("join as spectator or player?:\n0:Player:\n1:Spectator")
        player_or_spectator= int(input())
        match player_or_spectator:
            case 0:
                player_type= 0
                sio.emit("join room as player",room_name)
            case 1:
                sio.emit("join room as spectator",room_name)
sio.wait()
