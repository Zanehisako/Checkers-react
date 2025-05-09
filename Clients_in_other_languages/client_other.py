import socketio
import checkers_bot 

sio = socketio.Client()

board=[]
totaltime=[]
current_player_type=0

def turn(player_type):
    print("player_type",player_type)
    print("current_player_type",current_player_type)
    match player_type:
        case 1:
            if current_player_type==1:
                bestmove = checkers_bot.bestMove(board,1)
                print("white best move is :",bestmove)
                sio.emit("move piece",(bestmove,1))

        case 0:
            if current_player_type==0:
                bestmove = checkers_bot.bestMove(board,0)
                print("white best move is :",bestmove)
                sio.emit("move piece",(bestmove,0))


def handleBoard(new_board):
    global board 
    board = new_board

sio.on("board",handleBoard)

def updateTime(new_totaltime):
    global totaltime 
    totaltime = new_totaltime
    print("total time:",totaltime)

sio.on("total time",updateTime)

def handleMsg(msg):
    print(msg)
sio.on("msg",handleMsg)


def gameOver():
    print("Game Over")
    sio.disconnect()


sio.on("Game Over",gameOver)

def draw():
    print("Draw")
    sio.disconnect()

sio.on("Draw",draw)

sio.on('turn',turn)

def connect():
    print("connected successfully")
sio.on("connect",connect)

sio.connect("http://localhost:3001")
print("-------------Rooom Menu--------------")
room_choise =int(input("0:Create A room \n1:Join A room\n"))
room_name=input("Enter Room Name:")
match room_choise:
    case 0:
        current_player_type =1
        sio.emit("create room",room_name)
    case 1:
        current_player_type =0
        sio.emit("join room as player",room_name)
        pass
sio.wait()
