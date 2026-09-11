"""Original procedural score for Shared Moments. Python standard library only.
No samples, third-party music, or generative service assets. Deterministic seed.
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 48000
DURATION = 28
random.seed(31)
track = [0.0] * (RATE * DURATION)

def tone(start, duration, hz, gain, kind='bell'):
    offset = int(start * RATE)
    count = min(int(duration * RATE), len(track) - offset)
    for i in range(count):
        t = i / RATE
        release = min(1, (duration-t)/0.15)
        attack = min(1, t / (0.16 if kind == 'pad' else 0.012))
        envelope = attack * release * math.exp(-t * (0.8 if kind == 'pad' else 4))
        value = math.sin(math.tau*hz*t)
        value += .16 * math.sin(math.tau*hz*2*t)
        track[offset+i] += gain * value * envelope

# D minor 9 / B-flat major 7 / F major 9 / C suspended: warm, sparse resolution.
chords = [[146.83,220,261.63,329.63], [116.54,174.61,220,293.66],
          [130.81,196,261.63,329.63], [130.81,196,293.66,349.23]]
for bar in range(12):
    start = bar * 2.4
    if start >= 27: break
    chord = chords[(bar//2)%4]
    for hz in chord: tone(start, min(3.1,28-start), hz, .035, 'pad')
    if start < 22:
        for beat in range(4):
            at = start + beat*.6
            if at < 26: tone(at, .8, chord[beat]*2, .036)

# Low pulse and quiet, filtered-texture ticks. Less activity at the close.
for beat in range(40):
    start = beat*.6
    tone(start,.35,55,.085)
    offset = int((start+.3)*RATE)
    for i in range(int(.025*RATE)):
        track[offset+i] += random.uniform(-1,1)*.018*math.exp(-i/(RATE*.005))
for at,hz in [(3,440),(6,523.25),(10.5,659.25),(14.5,523.25),(18.5,440),(24.5,523.25),(24.7,659.25),(24.9,783.99)]:
    tone(at,2.2,hz,.065)

output=Path(__file__).resolve().parents[1]/'public/audio/shared-moments.wav'
output.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(output),'wb') as wav:
    wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(RATE)
    result=bytearray()
    for i,value in enumerate(track):
        t=i/RATE
        fade=min(1,t/.4,max(0,(28-t)/1.8))
        left=math.tanh(value*1.5)*.78*fade
        right=math.tanh((value + (track[i-659]*.12 if i>=659 else 0))*1.4)*.78*fade
        result.extend(struct.pack('<hh',int(left*32767),int(right*32767)))
    wav.writeframes(result)
print(output)
