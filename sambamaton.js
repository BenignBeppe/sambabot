var score = {
    duration: 1.0,
    notes: [
        {time: 0.0},
        {time: 0.4},
        {time: 0.55},
        {time: 0.7}
    ]}
var numberOfLines;
var canvas;
var context;
var startTime;
var looping = false;

function onLoad()
{
    playButton = document.getElementById("playButton");
    playButton.addEventListener("click", play, false);
    loopButton = document.getElementById("loopButton");
    loopButton.addEventListener("click", startPlayingLooped, false);
    stopButton = document.getElementById("stopButton");
    stopButton.addEventListener("click", stop, false);
    canvas = document.getElementById("scoreCanvas");
    context = scoreCanvas.getContext("2d");
    numberOfLines = 3;
    window.requestAnimationFrame(draw);
}

function play()
{
    startTime = Date.now();
    for(var note of score.notes)
    {
        setTimeout(click, note.time * 1000, new Audio("click.ogg"));
    }
}

function click(audio)
{
    audio.play();
}

function startPlayingLooped()
{
    looping = true;
    playLoop();
}

function playLoop()
{
    if(looping)
    {
        play();
        setTimeout(playLoop, score.duration * 1000);
    }
}

function stop()
{
    looping = false;
}

function draw()
{
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawNoteLines(3);
    drawNotes();
    drawTimeMarker();
    window.requestAnimationFrame(draw);
}

function drawNoteLines(numberOfLines)
{
    for(var i = 0; i < numberOfLines; i ++)
    {
        y = calculateNoteY(i);
        drawLine(0, y, canvas.width, y, 1);
    }
}

function calculateNoteY(noteIndex)
{
    var gapSize = canvas.height / (numberOfLines + 1);
    return gapSize * (noteIndex + 1);
}

function drawLine(startX, startY, endX, endY, width)
{
    context.beginPath();
    context.lineWidth = width;
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
}

function drawNotes()
{
    for(var note of score.notes)
    {
        var y = calculateNoteY(0, canvas);
        var x = (note.time / score.duration) * canvas.width;
        drawNote(x, y)
    }
}

function drawNote(x, y)
{
    drawCircle(x, y);
}

function drawCircle(x, y)
{
    context.beginPath();
    context.arc(x, y, 5, 0, 2 * Math.PI);
    context.fill();
}

function drawTimeMarker()
{
    var time = Date.now();
    var timeMarkerX = (((time - startTime) / 1000.0) / score.duration) *
        canvas.width;
    drawLine(timeMarkerX, 0, timeMarkerX, canvas.height, 2);
}
