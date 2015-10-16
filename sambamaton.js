var NOTE_SIZE = 5;

var score = {
    duration: 1.0,
    notes: [
        {time: 0.0, type: 0},
        {time: 0.25, type: 0},
        {time: 0.5, type: 0},
        {time: 0.75, type: 0}
    ]}
var numberOfLines;
var canvas;
var context;
var startTime;
var looping = false;
var selectedNote;

function onLoad()
{
    playButton = document.getElementById("playButton");
    playButton.addEventListener("click", play, false);
    loopButton = document.getElementById("loopButton");
    loopButton.addEventListener("click", startPlayingLooped, false);
    stopButton = document.getElementById("stopButton");
    stopButton.addEventListener("click", stop, false);
    canvas = document.getElementById("scoreCanvas");
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    context = scoreCanvas.getContext("2d");
    numberOfLines = 3;
    updateJson();
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

function mouseDown(event)
{
    var x = event.clientX - canvas.offsetLeft;
    var y = event.clientY - canvas.offsetTop;
    selectedNote = withinNote(x, y);
}

function withinNote(x, y)
{
    for(var note of score.notes)
    {
        var a = Math.abs(x - calculateNoteX(note));
        var b = Math.abs(y - calculateNoteY(note));
        var distance = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
        if(distance < NOTE_SIZE)
        {
            return note;
        }
    }
}

function mouseMove(event)
{
    if(selectedNote != null)
    {
        selectedNote.time = calculateNoteTime(event.clientX -
                                              canvas.offsetLeft);
        updateJson();
    }
}

function calculateNoteTime(x)
{
    return x * score.duration / canvas.width;
}

function updateJson()
{
    var jsonRepresentation = document.getElementById("jsonRepresentation");
    jsonRepresentation.value = JSON.stringify(score, null, 4);
}

function mouseUp(event)
{
    selectedNote = null;
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
        y = calculateNoteTypeY(i);
        drawLine(0, y, canvas.width, y, 1);
    }
}

function calculateNoteTypeY(noteType)
{
    var gapSize = canvas.height / (numberOfLines + 1);
    return gapSize * (noteType + 1);
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
        drawNote(note);
    }
}

function drawNote(note)
{
    var x = calculateNoteX(note);
    var y = calculateNoteY(note);
    var previousFillStyle = context.fillStyle;
    if(selectedNote == note)
    {
        context.fillStyle = "rgb(255, 0, 0)";
    }
    drawCircle(x, y, NOTE_SIZE);
    context.fillStyle = previousFillStyle;
}

function calculateNoteX(note)
{
    return (note.time / score.duration) * canvas.width;
}

function calculateNoteY(note)
{
    return calculateNoteTypeY(note.type);
}

function drawCircle(x, y, r)
{
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.fill();
}

function drawTimeMarker()
{
    var time = Date.now();
    var timeMarkerX = (((time - startTime) / 1000.0) / score.duration) *
        canvas.width;
    drawLine(timeMarkerX, 0, timeMarkerX, canvas.height, 2);
}
