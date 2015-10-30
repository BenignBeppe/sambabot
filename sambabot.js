var NOTE_SIZE = 5;
var CLOSE_DISTANCE = 20;
var ADD_NOTE = "ADD_NOTE";
var REMOVE_NOTE = "REMOVE_NOTE";
var RECORD = "RECORD";
var FPS = 30;
var REQUEST_ANIMATION_FRAME = "REQUEST_ANIMATION_FRAME"
var INTERVAL = "INTERVAL"

var score = {
    beats: 8,
    bpm: 80,
    noteTypes: [
        "sounds/repinique-head.ogg",
        "sounds/repinique-rimshot.ogg",
        "sounds/repinique-hand.ogg"
    ],
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
var selectedNotes = [];
var highlightedNote;
var highlightedNoteLine;
var mode;
var sounds;
var clickSound;
var jsonRepresentation;
var spaceDown = false;
var recordKeys = {
    j: {noteType: 0, down: false},
    k: {noteType: 1, down: false},
    f: {noteType: 2, down: false}
}
var selectionStartPoint;
var selectionEndPoint;
var undoHistory = [];
var notesMoved = false;

function onLoad()
{
    initSoundLoop();
    updateSounds();
    clickSound = new Audio("sounds/repinique-head.ogg");
    loadScoreFromUrl();
    canvas = document.getElementById("scoreCanvas");
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    context = scoreCanvas.getContext("2d");
    addClickListener("addButton", enterAddNoteMode);
    addClickListener("removeButton", enterRemoveNoteMode);
    addClickListener("recordButton", record);
    addClickListener("playButton", play);
    addClickListener("loopButton", startPlayingLooped);
    addClickListener("stopButton", stop);
    var bpmInput = document.getElementById("bpmInput");
    bpmInput.addEventListener("input", updateBpm, false);
    bpmInput.value = score.bpm;
    addEventListener("keydown", keyDown, false);
    addEventListener("keyup", keyUp, false);
    jsonRepresentation = document.getElementById("jsonRepresentation");
    updateJson();
    addClickListener("loadJsonButton", loadJson);
    renderMode = INTERVAL;
    if(renderMode = INTERVAL)
    {
        setInterval(draw, 1000 / FPS);
    }
    else if(renderMode == REQUEST_ANIMATION_FRAME)
    {
        window.requestAnimationFrame(draw);
    }
    else
    {
        console.error("Uknown render mode:", renderMode);
    }
}

function initSoundLoop()
{
    soundLoop = new Worker("sound-loop.js");
    soundLoop.onmessage = onSoundLoopMessage;
    updateScoreInSoundLoop();
}

function updateSounds()
{
    sounds = [];
    for(var i = 0; i < score.notes.length; i ++)
    {
        var note = score.notes[i];
        var sound = new Audio(score.noteTypes[note.type]);
        sounds.push(sound);
    }
}

function loadScoreFromUrl()
{
    var scoreName = getSearchParameter("score");
    if(scoreName != null)
    {
        var scorePath = "scores/" + scoreName + ".json";
        console.log("scorePath =", scorePath);
        var request = new XMLHttpRequest();
        request.open("GET", scorePath);
        request.onreadystatechange = function() {
            var scoreJson = request.response;
            jsonRepresentation.value = scoreJson;
            loadJson();
        };
        request.send();
    }
    saveUndoState();
}

function saveUndoState()
{
    undoHistory.push(JSON.parse(JSON.stringify(score)));
    console.log("Saving undo state. # of states now:", undoHistory.length);
}

function getSearchParameter(parameterName)
{
    var parameters = location.search.substring(1).split("&");
    for(var parameter of parameters)
    {
        var keyAndValue = parameter.split("=");
        if(keyAndValue[0] == parameterName)
        {
            return keyAndValue[1];
        }
    }
}

function updateScoreInSoundLoop(scoreToPost)
{
    if(scoreToPost == null)
    {
        scoreToPost = score;
    }
    postMessageToSoundLoop("score", scoreToPost);
}

function onSoundLoopMessage(message)
{
    var type = message.data.type;
    var content = message.data.content;
    if(type == "playNote")
    {
        playNote(content);
    }
    else if(type == "playClick")
    {
        clickSound.currentTime = 0;
        clickSound.play();
    }
    else if(type == "scoreDone")
    {
        if(mode == RECORD)
        {
            updateScoreInSoundLoop();
            mode = null;
        }
    }
    else if(type == "startTime")
    {
        startTime = content;
    }
    else
    {
        console.warn("Message of unkown type received:", message);
    }
}

function postMessageToSoundLoop(type, content)
{
    soundLoop.postMessage({type: type, content: content});
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

function record()
{
    mode = RECORD;
    postMessageToSoundLoop("playIntro");
}

function play()
{
    postMessageToSoundLoop("play");
    startTime = Date.now();
}

function playNote(noteIndex)
{
    var note = score.notes[noteIndex];
    var sound = sounds[noteIndex];
    console.log("> playNote():", note.time - (Date.now() - startTime) / 1000.0);
    sound.play();
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
    updateScoreInSoundLoop();
    updateJson();
}

function mouseDown(event)
{
    var x = xInCanvas(event.clientX);
    var y = yInCanvas(event.clientY);
    if(mode == ADD_NOTE)
    {
        if(highlightedNoteLine == null)
        {
            mode = null;
        }
        else
        {
            addNote(x, highlightedNoteLine);
            updateScoreInSoundLoop();
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
            removeNotes([highlightedNote]);
        }
    }
    else
    {
        var note = withinNote(x, y);
        if(note != null)
        {
            if(selectedNotes.indexOf(note) == -1)
            {
                if(!event.shiftKey)
                {
                    selectedNotes = [];
                }
                selectNote(note);
            }
        }
        else
        {
            selectedNotes = [];
            selectionStartPoint = {x: x, y: y};
            selectionEndPoint = {x: x, y: y};
        }
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

function addNote(x, type)
{
    saveUndoState();
    var time = calculateNoteTime(x);
    var note = {time: time, type: type};
    score.notes.push(note);
    sounds.push(new Audio(score.noteTypes[note.type]));
    updateJson();
}

function removeNotes(notes)
{
    saveUndoState();
    for(note of notes)
    {
        var index = score.notes.indexOf(note);
        score.notes.splice(index, 1);
        sounds.splice(index, 1);
    }
    updateScoreInSoundLoop();
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

function selectNote(note)
{
    if(selectedNotes.indexOf(note) == -1)
    {
        selectedNotes.push(note);
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
    else if(event.buttons == 1 && selectedNotes.length > 0)
    {
        if(!notesMoved)
        {
            notesMoved = true;
            saveUndoState();
        }
        for(var note of selectedNotes)
        {
            moveNote(note, event.movementX);
        }
    }
    else if(selectionStartPoint != null)
    {
        selectionEndPoint.x = x;
        selectionEndPoint.y = y;
    }
    else
    {
        highlightedNote = withinNote(x, y);
    }
}

function moveNote(note, deltaX)
{
    note.time += calculateNoteTime(deltaX);
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
    jsonRepresentation.value = JSON.stringify(score, null, 4);
}

function loadJson()
{
    score = JSON.parse(jsonRepresentation.value);
    updateScoreInSoundLoop();
    updateSounds();
    bpmInput.value = score.bpm;
}

function mouseUp(event)
{
    if(selectionStartPoint != null)
    {
        selectNodesInRectangle();
        selectionStartPoint = null;
        selectionEndPoint = null;
    }
    if(notesMoved)
    {
        updateScoreInSoundLoop();
        updateJson();
        notesMoved = false;
    }
}

function selectNodesInRectangle()
{
    for(var note of score.notes)
    {
        var x = calculateNoteX(note);
        var y = calculateNoteY(note);
        var minX = Math.min(selectionStartPoint.x, selectionEndPoint.x);
        var maxX = Math.max(selectionStartPoint.x, selectionEndPoint.x);
        var minY = Math.min(selectionStartPoint.y, selectionEndPoint.y);
        var maxY = Math.max(selectionStartPoint.y, selectionEndPoint.y);
        if(x > minX && x < maxX && y > minY && y < maxY)
        {
            selectedNotes.push(note);
        }
    }
}

function keyDown(event)
{
    if(mode == RECORD)
    {
        if(event.key in recordKeys && !recordKeys[event.key].down)
        {
            var time = ((Date.now() - startTime) / 1000) /
                calculateDuration() * score.beats;
            addNote(timeToX(time), recordKeys[event.key].noteType);
            recordKeys[event.key].down = true;
        }
    }
    else
    {
        if(event.key == "Delete")
        {
            removeSelectedNotes();
        }
        if(event.key == "z" && event.ctrlKey)
        {
            undo();
        }
    }
}

function removeSelectedNotes()
{
    removeNotes(selectedNotes);
    selectedNotes = [];
}

function undo()
{
    if(undoHistory.length > 0)
    {
        score = undoHistory.pop();
        updateScoreInSoundLoop();
        updateSounds();
        updateJson();
    }
}

function keyUp(event)
{
    if(event.key in recordKeys)
    {
        recordKeys[event.key].down = false;
    }
}

function draw()
{
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawNoteLines();
    drawBeatLines();
    drawNotes();
    drawTimeMarker();
    drawSelectionRectangle();
    if(renderMode == REQUEST_ANIMATION_FRAME)
    {
        window.requestAnimationFrame(draw);
    }
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
    if(selectedNotes.indexOf(note) != -1)
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
    var x = timeToX(note.time);
    return x;
}

function timeToX(time)
{
    var x = time / score.beats * canvas.width;
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

function drawSelectionRectangle()
{
    if(selectionStartPoint != null)
    {
        context.beginPath();
        context.lineWidth = 1;
        context.rect(selectionStartPoint.x,
                     selectionStartPoint.y,
                     selectionEndPoint.x - selectionStartPoint.x,
                     selectionEndPoint.y - selectionStartPoint.y);
        context.stroke();
    }
}
