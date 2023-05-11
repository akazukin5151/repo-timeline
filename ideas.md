# ideas for applying metroani to portfolio

1. timeline of my experiences
   stations = one historical event (eg dissertation)
   lines = programming language
   this could also be an entire metro map

at least, can also turn the portfolio into a timeline based one, with work and personal projects interspersed

2. skills
   station = skill (eg python)

# problems

- what kind of interactivity? what should clicking on stations do? does having animations interfere with interactivity?
- english text is not really good for vertical japanese text

# problem
we can't assign station positions before drawing the lines
as we need to know if the lines intersect
but drawing the lines requires connecting through stations first,
which we don't know the position of
so we must pick either station first or line first, and then fix any problems after that
i'll just go with station first

line first can probably get a more ideal map, but it would require fixing multiple lines when they clash
eg, place one line ideally. then place another line ideally, but that's impossible without changing the previous line. but changing both might require changing another previous line

# idea 1

ideas for station placement algorithm
identify longest line as trunk that's linear
distribute stations as usual
~~force lines starting on the left of the trunk, to always remain on the left. vice versa for right~~

in general, it's not possible to force lines to be on the left and right without crossing
and we actually want some crossing to make the map interesting, otherwise it will just be a bunch of linear lines

we should limit the maximum number of crossings to 1 (or 2?). every line should only cross the trunk once.

# other criteria
starting and ending stations should never cross the trunk
this means the first two stations and the last two stations should be on the same side

for R, should the first station be moved to the right, or should the second station be moved to the left?
the first station has only one line, so that's simpler
for R, this will shift the second last station to the right

for julia, this algorithm will move the last two stations to the right, leaving one station on the left
if we move the last station to the right, it would interfere with other lines
best to move the second last and third last stations to the left
we can move the second last station to the right (the only other line on this station is trunk, so ignor)

then correcting "one station on left" problem: move line platforms in the same station to better align with the overall line
so for julia, this will shift the "one station on left" to the right of trunk

for jupyter notebook, shift first station to right and shift second last station to left
we want to shift last station to right, so add this rule:
only when shifting second station, check the previous station. if it's on the same side as the second, do not shift
if it's on the opposite side as the second, shift
this is irrelevant for shifting first station

for css, shift first station to left

for shell, shift last station to right

this should stop after trunk stops

---

lines should not cross the trunk without a station on the trunk
for simplicity, allow crossing non trunk lines
hard to fix this without the previous

# idea 1.1

identify lines that share few stations with the trunk,
these can be perpendicular to it
identify stations with many lines, these are main interchange stations
and should be evenly distributed around the 2d space

as most lines share few stations the trunk, it implies the trunk
should be bended, and the "fast" lines that skip stations along the trunk
should be straighter

should also maintain the time dimension, which would be lost if stations had proper
2d coords
perhaps top left corner is oldest, bottom right corner is newest
equi-time lines perpendicular indicate same time, but different spatial variation
but that would just result in a \ sloped line like before

lines should be curvy, but that's hard to do when all stations are equally spaced apart
adding some variation, like denser in the center, could work

lines should also not cross each other significantly without sharing a stop in
intersection
or at least, not cross the main trunk without an intersection
