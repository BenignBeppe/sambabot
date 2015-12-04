var NOTE_SIZE = 5;
var CLOSE_DISTANCE = 20;
var ADD_NOTE = "ADD_NOTE";
var REMOVE_NOTE = "REMOVE_NOTE";
var RESIZE = "RESIZE";
var RECORD = "RECORD";
var FPS = 30;
var REQUEST_ANIMATION_FRAME = "REQUEST_ANIMATION_FRAME"
var INTERVAL = "INTERVAL"

var mainSheet;
var startTime;
var looping = false;
var mode;
var sounds;
var clickSound;
var jsonRepresentation;
var recordKeys = {
    j: {noteType: 0, down: false},
    k: {noteType: 1, down: false},
    f: {noteType: 2, down: false}
}
var undoHistory = [];
var notesMoved = false;
var animate = true;
var shownDialogue;
var renderMode;

function onLoad()
{
    jsonRepresentation = document.getElementById("jsonRepresentation");
    canvas = document.getElementById("scoreCanvas");
    initSoundLoop();
    mainSheet = new Sheet(canvas);
    loadInitialScore();
    updateScoreInSoundLoop();
    updateSounds();
    clickSound = new Audio("sounds/repinique-head.ogg");
    var bpmInput = document.getElementById("bpmInput");
    bpmInput.addEventListener("input", updateBpm, false);
    bpmInput.value = mainSheet.getScore().bpm;
    var animateCheckbox = document.getElementById("animateCheckbox");
    animateCheckbox.addEventListener("change", function(e){
        animate=e.target.checked}, false);
    addEventListener("keydown", keyDown, false);
    addEventListener("keyup", keyUp, false);
    updateJson();
    renderMode = INTERVAL;
    if(renderMode == INTERVAL)
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
}

function updateSounds()
{
    sounds = [];
    for(note of mainSheet.getScore().notes)
    {
        var sound = new Audio(mainSheet.getScore().noteTypes[note.type]);
        sounds.push(sound);
    }
}

function loadInitialScore()
{
    loadScoreFromUrl();
    if(mainSheet.getScore() == null)
    {
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
            ]};
        mainSheet.setScore(score);
        updateJson();
    }
    saveUndoState();
}

function loadJson()
{
    var score = JSON.parse(jsonRepresentation.value);
    mainSheet.setScore(score);
    updateScoreInSoundLoop();
    updateSounds();
    bpmInput.value = mainSheet.getScore().bpm;
}

function loadScoreFromUrl()
{
    var scoreName = getSearchParameter("score");
    if(scoreName != null)
    {
        var scorePath = "scores/" + scoreName + ".json";
        jsonRepresentation.value = readFile(scorePath);
        loadJson();
    }
}

function readFile(path)
{
    var request = new XMLHttpRequest();
    request.open("GET", path, false);
    var content;
    request.onreadystatechange = function() {
        content = request.response;
    };
    request.send();
    return content;
}

function saveUndoState()
{
    undoHistory.push(JSON.parse(JSON.stringify(mainSheet.getScore())));
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

function updateScoreInSoundLoop()
{
    postMessageToSoundLoop("score", mainSheet.getScore());
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
    if(content == null)
    {
        content = {};
    }
    var message = {type: type, content: content};
    try
    {
        soundLoop.postMessage(message);
    }
    catch(e)
    {
        console.error("Couldn't post message:", message, e.message);
    }
}

function addClickListener(elementId, listenerFunction)
{
    var element = document.getElementById(elementId);
    element.addEventListener("click", listenerFunction, false);
}

function toggleAddNoteMode()
{
    toggleMode(ADD_NOTE, "crosshair");
}

function toggleMode(newMode, cursor)
{
    if(newMode == mode)
    {
        mode = null;
        canvas.style.cursor = "default";
    }
    else
    {
        console.log("Entering mode:", newMode)
        mode = newMode;
        canvas.style.cursor = cursor;
    }
}

function toggleRemoveNoteMode()
{
    toggleMode(REMOVE_NOTE);
}

function toggleResizeMode()
{
    toggleMode(RESIZE, "ew-resize");
}

function play(looping)
{
    postMessageToSoundLoop("play", {looping: looping});
    startTime = Date.now();
}

function playNote(noteIndex)
{
    var note = mainSheet.getScore().notes[noteIndex];
    var sound = sounds[noteIndex];
    var expectedTime = Date.now() - startTime;
    var actualTime = note.time * (60 / mainSheet.getScore().bpm);
    console.log("> playNote():", actualTime - expectedTime / 1000.0);
    sound.play();
}

function stop()
{
    postMessageToSoundLoop("stop");
}

function record()
{
    mode = RECORD;
    postMessageToSoundLoop("playIntro");
}

function importFromScore()
{
    var dialogue = showDialogue("importDialogue");
    var scores = readFile("scores-list.txt").trim().split("\n");
    for(var score of scores)
    {
        var button = document.createElement("button");
        button.innerHTML = score;
        var item = document.createElement("li");
        document.getElementById("dialogueScoreList").appendChild(item);
        item.appendChild(button);
    }
}

function showDialogue(id)
{
    document.getElementById("overlay").style.visibility = "visible";
    var dialogue = document.getElementById(id);
    dialogue.style.visibility = "visible";
    shownDialogue = id;
    return dialogue;
}

function cancelDialogue()
{
    document.getElementById("overlay").style.visibility = "hidden";
    document.getElementById(shownDialogue).style.visibility = "hidden";
    shownDialogue = null;
}

function updateBpm(event)
{
    mainSheet.getScore().bpm = parseFloat(event.target.value);
    updateScoreInSoundLoop();
    updateJson();
}

function addSound(path)
{
    sounds.push(new Audio(path));
    updateJson();
}

function updateJson()
{
    jsonRepresentation.value = JSON.stringify(mainSheet.getScore(), null, 4);
}

function keyDown(event)
{
    if(mode == RECORD)
    {
        if(event.key in recordKeys && !recordKeys[event.key].down)
        {
            var time = ((Date.now() - startTime) / 1000) /
                mainSheet.calculateDuration() * mainSheet.getScore().beats;
            mainSheet.addNote(time, recordKeys[event.key].noteType);
            recordKeys[event.key].down = true;
        }
    }
    else
    {
        if(event.key == "Delete")
        {
            mainSheet.removeSelectedNotes();
        }
        if(event.key == "z" && event.ctrlKey)
        {
            undo();
        }
    }
}

function undo()
{
    if(undoHistory.length > 0)
    {
        mainSheet.setScore(undoHistory.pop());
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
    if(animate)
    {
        mainSheet.draw();
        if(renderMode == REQUEST_ANIMATION_FRAME)
        {
            mainSheet.draw();
            window.requestAnimationFrame(draw);
        }
    }
}
