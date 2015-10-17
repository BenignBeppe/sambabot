var NOTE_SIZE = 5;
var CLOSE_DISTANCE = 20;
var ADD_NOTE = "ADD_NOTE";
var REMOVE_NOTE = "REMOVE_NOTE";

var score = {
    beats: 4,
    bpm: 80,
    noteTypes: {
        0: "sounds/repinique-head.ogg",
        1: "sounds/repinique-rimshot.ogg",
        2: "sounds/repinique-hand.ogg"
    },
    notes: [
        {time: 0.0, type: 0},
        {time: 0.25, type: 1},
        {time: 0.5, type: 1},
        {time: 0.75, type: 2},
        {time: 1.0, type: 0},
        {time: 1.25, type: 1},
        {time: 1.5, type: 1},
        {time: 1.75, type: 2}
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
    addClickListener("addButton", enterAddNoteMode);
    addClickListener("removeButton", enterRemoveNoteMode);
    addClickListener("playButton", play);
    addClickListener("loopButton", startPlayingLooped);
    addClickListener("stopButton", stop);
    var bpmInput = document.getElementById("bpmInput");
    bpmInput.addEventListener("input", updateBpm, false);
    bpmInput.value = score.bpm;
    canvas = document.getElementById("scoreCanvas");
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    context = scoreCanvas.getContext("2d");
    updateJson();
    window.requestAnimationFrame(draw);
}

function addClickListener(elementId, listenerFunction)
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
        setTimeout(playSound, (note.time / score.bpm * 60) * 1000, sound);
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
        setTimeout(playLoop, calculateDuration() * 1000);
    }
}

function stop()
{
    looping = false;
}

function updateBpm(event)
{
    score.bpm = parseFloat(event.target.value);
    updateJson();
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
    else
    {
        highlightedNote = withinNote(x, y);
    }
}

function calculateNoteTime(x)
{
    return (x / canvas.width) * score.beats;
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
}

function draw()
{
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawNoteLines();
    drawBeatLines();
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

function drawBeatLines()
{
    for(var i = 1; i < score.beats; i ++)
    {
        drawBeatLine(i);
    }
}

function drawBeatLine(index)
{
    var x = (canvas.width / (score.beats / index));
    drawLine(x, 0, x, canvas.height, 1);
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
    var previousStrokeStyle = context.strokeStyle;
    var previousFillStyle = context.fillStyle;
    if(selectedNote == note)
    {
        context.fillStyle = "rgb(255, 0, 0)";
    }
    if(highlightedNote == note)
    {
        context.strokeStyle = "rgb(255, 0, 0)";
        strokeCircle(x, y, NOTE_SIZE, 3);
    }
    fillCircle(x, y, NOTE_SIZE);
    context.strokeStyle = previousStrokeStyle;
    context.fillStyle = previousFillStyle;
}

function calculateNoteX(note)
{
    var x = note.time / score.beats * canvas.width;
    return x;
}

function calculateNoteY(note)
{
    return calculateNoteTypeY(note.type);
}

function fillCircle(x, y, r)
{
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.fill();
}

function strokeCircle(x, y, r, width)
{
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.lineWidth = width;
    context.stroke();
}

function drawTimeMarker()
{
    var time = Date.now();
    var x = (((time - startTime) / 1000.0) / calculateDuration()) *
        canvas.width;
    drawLine(x, 0, x, canvas.height, 2);
}

function calculateDuration()
{
    return score.beats / score.bpm * 60;
}
