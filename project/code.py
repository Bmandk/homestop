import time
import board
import gc
import displayio
import terminalio
from adafruit_matrixportal.matrixportal import MatrixPortal
from adafruit_display_text import label

LINES = 5
VERTICAL_OFFSET = 4

matrixportal = MatrixPortal(
    status_neopixel=board.NEOPIXEL,
    rotation=270,
)

display = matrixportal.display

group = displayio.Group()

bus_file = open("/bus.bmp", "rb")
bus = displayio.OnDiskBitmap(bus_file)
del bus_file

train_file = open("/train.bmp", "rb")
train = displayio.OnDiskBitmap(train_file)
del train_file

display.show(group)
# matrixportal.add_text(
#     text_position=(1, 31),
#     text_color=0xFFFFFF,
#     line_spacing=0.9,
# )

gc.collect()

# Possibly use groups to show both text and images

def json_to_string(val):
    s = ""
    counter = 0
    for departure in val:
        minutesStr = str(departure["minutes"])
        if len(minutesStr) == 1:
            minutesStr = "0" + minutesStr
        s = s + minutesStr + "\n"
        counter = counter + 1
        if counter >= LINES:
            break

    return s

def display_stops(data):
    group = displayio.Group()
    text = label.Label(terminalio.FONT, text=json_to_string(data))
    text.line_spacing = 0.9
    text.x = 32 - 6 * 2 # Display width is 32, characters width is 6
    text.y = 3 + VERTICAL_OFFSET
    text.anchor_point = (0, 0)
    group.append(text)

    for i in range(LINES):
        sprite = bus
        if data[i]["line"] == "F":
            sprite = train
        tile_grid = displayio.TileGrid(sprite, pixel_shader=getattr(sprite, 'pixel_shader', displayio.ColorConverter()))
        tile_grid.x = 2
        tile_grid.y = VERTICAL_OFFSET + i * 12
        group.append(tile_grid)
        
    display.show(group)

endpoint = "http://185.17.144.187:3001/departures?stops=705,706&lines=F,2A&directions=Hellerup%20St.,Refshale%C3%B8en"

test_data = [
    {
        "line": "2A",
        "minutes": 1
    },
    {
        "line": "F",
        "minutes": 3
    },
    {
        "line": "2A",
        "minutes": 6
    },
    {
        "line": "2A",
        "minutes": 13
    },
    {
        "line": "F",
        "minutes": 15
    },
    {
        "line": "2A",
        "minutes": 23
    },
]

while True:
    #pass
    #display_stops(test_data)
    try:
        matrixportal.network.connect()
        res = matrixportal.network.requests.get(endpoint)
        print(res.json())
        display_stops(res.json())

    except Exception as e:
        print("Some error occured, retrying! -", e)

    time.sleep(30)  # wait 30 seconds
    gc.collect()
