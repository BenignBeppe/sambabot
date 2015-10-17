var NOTE_SIZE = 5;
var CLOSE_DISTANCE = 20;
var ADD_NOTE = "ADD_NOTE";
var REMOVE_NOTE = "REMOVE_NOTE";

var score = {
    duration: 1.0,
    noteTypes: {
        0: "sounds/repinique-head.ogg",
        1: "sounds/repinique-rimshot.ogg",
        2: "sounds/repinique-hand.ogg"
    },
    notes: [
        {time: 0.0, type: 0},
        {time: 0.25, type: 1},
        {time: 0.5, type: 1},
        {time: 0.75, type: 2}
    ]}
var canvas;
var context;
var startTime;
var looping = false;
var selectedNote;
var highlightedNote;
var highlightedNoteLine;
var mode;

function onLoad()
{
    addOnClickListener("addButton", enterAddNoteMode);
    addOnClickListener("removeButton", enterRemoveNoteMode);
    addOnClickListener("playButton", play);
    addOnClickListener("loopButton", startPlayingLooped);
    addOnClickListener("stopButton", stop);
    canvas = document.getElementById("scoreCanvas");
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    context = scoreCanvas.getContext("2d");
    updateJson();
    window.requestAnimationFrame(draw);
}

function addOnClickListener(elementId, listenerFunction)
{
    var element = document.getElementById(elementId);
    element.addEventListener("click", listenerFunction, false);
}

function enterAddNoteMode()
{
    mode = ADD_NOTE;
}

function enterRemoveNoteMode()
{
    mode = REMOVE_NOTE;
}

function play()
{
    startTime = Date.now();
    for(var note of score.notes)
    {
        var sound = new Audio(score.noteTypes[note.type]);
        setTimeout(playSound, note.time * 1000, sound);
    }
}

function playSound(audio)
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
    if(mode == ADD_NOTE)
    {
        if(highlightedNoteLine == null)
        {
            mode = null;
        }
        else
        {
            addNote(xInCanvas(event.clientX));
        }
    }
    else if(mode == REMOVE_NOTE)
    {
        if(highlightedNote == null)
        {
            mode = null;
        }
        else
        {
            removeNote(highlightedNote);
        }
    }
    else
    {
        var x = xInCanvas(event.clientX);
        var y = yInCanvas(event.clientY);
        selectedNote = withinNote(x, y);
        highlightedNote = selectedNote;
    }
}

function xInCanvas(rawX)
{
    return rawX - canvas.offsetLeft;
}

function yInCanvas(rawY)
{
    return rawY - canvas.offsetTop;
}

function addNote(x)
{
    var time = calculateNoteTime(x);
    var note = {time: time, type: highlightedNoteLine};
    score.notes.push(note);
    updateJson();
}

function removeNote(note)
{
    var index = score.notes.indexOf(note);
    score.notes.splice(index, 1);
    updateJson();
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
    var y = yInCanvas(event.clientY);
    var x = xInCanvas(event.clientX);
    if(mode == ADD_NOTE)
    {
        highlightedNoteLine = closeToNoteLine(y);
    }
    else if(mode == REMOVE_NOTE)
    {
        highlightedNote = withinNote(x, y);
    }
    else if(selectedNote != null)
    {
        selectedNote.time = calculateNoteTime(x);
        updateJson();
    }
}

function calculateNoteTime(x)
{
    return x * score.duration / canvas.width;
}

function closeToNoteLine(y)
{
    var closestNoteLine;
    var closestDistance;
    for(var i = 0; i < Object.keys(score.noteTypes).length; i ++)
    {
        var noteLineY = calculateNoteTypeY(i);
        var distance = Math.abs(noteLineY - y);
        if(distance < CLOSE_DISTANCE)
        {
            closestNoteLine = i;
            closestDistance = distance;
        }
    }
    return closestNoteLine;
}

function updateJson()
{
    var jsonRepresentation = document.getElementById("jsonRepresentation");
    jsonRepresentation.value = JSON.stringify(score, null, 4);
}

function mouseUp(event)
{
    selectedNote = null;
    highlightedNote = null;
}

function draw()
{
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawNoteLines();
    drawNotes();
    drawTimeMarker();
    window.requestAnimationFrame(draw);
}

function drawNoteLines()
{
    for(var i = 0; i < numberOfNoteTypes(); i ++)
    {
        drawNoteLine(i);
    }
}

function drawNoteLine(index)
{
    var previousStrokeStyle = context.strokeStyle;
    y = calculateNoteTypeY(index);
    if(highlightedNoteLine == index)
    {
        context.strokeStyle = "rgb(255, 0, 0)";
    }
    drawLine(0, y, canvas.width, y, 1);
    context.strokeStyle = previousStrokeStyle;
}

function numberOfNoteTypes()
{
    return Object.keys(score.noteTypes).length
}

function calculateNoteTypeY(noteType)
{
    var gapSize = canvas.height / (numberOfNoteTypes() + 1);
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
    if(highlightedNote == note)
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
