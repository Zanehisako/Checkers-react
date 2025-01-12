import socketio
import time 
from numpy import random 

sio = socketio.Client()

black_moves = [
    # Black piece 42 moves (starts at x:2, y:5)
    {'index': 42, 'x': 3, 'y': 4},  # First diagonal move
    {'index': 42, 'x': 4, 'y': 3},  # Advances further
    {'index': 42, 'x': 2, 'y': 1},  # Captures white piece
    
    # Black piece 44 moves (starts at x:4, y:5)
    {'index': 44, 'x': 3, 'y': 4},  # Moves to support
    {'index': 44, 'x': 2, 'y': 3},  # Continues advance
    {'index': 44, 'x': 0, 'y': 1},  # Captures white piece
    
    # Black piece 51 moves (starts at x:3, y:6)
    {'index': 51, 'x': 4, 'y': 5},  # Moves forward
    {'index': 51, 'x': 5, 'y': 4},  # Sets up for capture
    {'index': 51, 'x': 3, 'y': 2}   # Makes a capture
]

white_moves = [
    # White piece 17 moves (starts at x:1, y:2)
    {'index': 17, 'x': 2, 'y': 3},  # Tries to block
    {'index': 17, 'x': 3, 'y': 4},  # Moves away from threat
    
    # White piece 19 moves (starts at x:3, y:2)
    {'index': 19, 'x': 4, 'y': 3},  # Defensive move
    {'index': 19, 'x': 5, 'y': 4},  # Tries to escape
    
    # White piece 12 moves (starts at x:4, y:1)
    {'index': 12, 'x': 3, 'y': 2},  # Repositions
    {'index': 12, 'x': 2, 'y': 3},  # Defensive stance
    
    # White piece 21 moves (starts at x:5, y:2)
    {'index': 21, 'x': 4, 'y': 3},  # Support move
    {'index': 21, 'x': 3, 'y': 4}   # Final defensive position
]

@sio.event
def connect():
    print("connected to localhost")
sio.connect("http://localhost:3001")
while True:
    for i in range(len(black_moves)-1):
        print("move",black_moves[i])
        sio.emit("move piece",(black_moves[i],0,random.randint(10)))
        time.sleep(0.5)
        sio.emit("move piece",(white_moves[i],1,random.randint(10)))
        time.sleep(0.5)
    break

