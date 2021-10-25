
# infrastructure based on https://github.com/Gaweph/p5-typescript-starter

# to run:

to run, do an npm install then "run npm start"

# goal:

this visual aims to visual a particle system that leverages a quad-tree in it's collision logic

clicking on the screen will create a new particle with a variable size and speed

as more particles are added the quad tree will sub divide, each "cell" in the tree can hold a maximum of 2 particles before it divides into 4

the lines between each particle represent which particles are being compared to each render cycle to determine collision 

the color of the lines becomes more vibrant the closer 2 particles are to colliding

overall the quad tree lets us optimize our collision detection as we can greatly reduce the number of comparisons we need to run each render cycle (n log n down from n^2). It's also pretty cool to look at :)