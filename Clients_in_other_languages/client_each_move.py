import socketio
import time 
import player1
import player2

sio = socketio.Client()

board=[]

def turn(player_type):
    match player_type:

        case 1:
            bestmove = player1.bestMove(board,1)
            sio.emit("move piece bot",(bestmove,1))

        case 0:
            bestmove = player2.bestMove(board,0)
            sio.emit("move piece bot",(bestmove,0))


def handleBoard(new_board):
    global board 
    print("old board:",board)
    board = new_board
    print("new board:",board)

sio.on("board",handleBoard)

def handleMsg(msg):
    print(msg)
sio.on("msg",handleMsg)


def gameOver():
    print("Game Over")
    sio.disconnect()

sio.on("Game Over",gameOver)



sio.on('turn',turn)

def connect():
    print("connected successfully")
sio.on("connect",connect)

sio.connect("http://localhost:3001")
time.sleep(0.5)
print("creating bots game:")
sio.emit("create room bots","bots")
sio.wait()
