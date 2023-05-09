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

# idea 1

ideas for station placement algorithm
identify longest line as trunk that's linear
distribute stations as usual
force lines starting on the left of the trunk, to always remain on the left
same for the right


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
