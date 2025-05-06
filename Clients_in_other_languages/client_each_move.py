import socketio
import time 
import checkers_bot 

sio = socketio.Client()

board=[]
totaltime=[]

def turn(player_type):
    match player_type:
        case 1:
            bestmove = checkers_bot.bestMove(board,1)
            print("white best move is :",bestmove)
            sio.emit("move piece bot",(bestmove,1))

        case 0:
            bestmove = checkers_bot.bestMove(board,0)
            print("black best move is :",bestmove)
            sio.emit("move piece bot",(bestmove,0))


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



sio.on('turn',turn)

def connect():
    print("connected successfully")
sio.on("connect",connect)

sio.connect("http://localhost:3001")
time.sleep(0.5)
print("creating bots game:")
sio.emit("create room bots","bots")
sio.wait()
