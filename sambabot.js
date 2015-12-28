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
var importSheet;
var importedNotes = [];

function onLoad()
{
    jsonRepresentation = document.getElementById("jsonRepresentation");
    initSoundLoop();
    mainSheet = new MainSheet(document.getElementById("scoreCanvas"));
    loadScoreFromUrl();
    saveUndoState();
    clickSound = new Audio("sounds/repinique-head.ogg");
    var bpmInput = document.getElementById("bpmInput");
    bpmInput.addEventListener("input", updateBpm, false);
    bpmInput.value = mainSheet.score.bpm;
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
    importSheet = new ImportSheet(
        document.getElementById("importScoreCanvas"));
}

function initSoundLoop()
{
    soundLoop = new Worker("sound-loop.js");
    soundLoop.onmessage = onSoundLoopMessage;
}

function updateSounds()
{
    sounds = [];
    for(note of mainSheet.score.notes)
    {
        var sound = new Audio(mainSheet.score.noteTypes[note.type]);
        sounds.push(sound);
    }
}

function loadJsonFromRepresentation()
{
    mainSheet.score = JSON.parse(jsonRepresentation.value);
    updateScoreInSoundLoop();
    updateSounds();
    bpmInput.value = mainSheet.score.bpm;
}

function loadScoreFromUrl()
{
    var scoreName = getSearchParameter("score");
    if(scoreName != null)
    {
        loadScore(readScoreFromFile(scoreName));
        return true;
    }
    return false;
}

function loadScore(score)
{
    mainSheet.score = score;
    updateJson();
    updateScoreInSoundLoop();
    updateSounds();
}

function readScoreFromFile(scoreName)
{
    var scorePath = "scores/" + scoreName + ".json";
    var json = readFile(scorePath);
    var score = JSON.parse(json);
    return score;
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
    undoHistory.push(JSON.parse(JSON.stringify(mainSheet.score)));
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
    postMessageToSoundLoop("score", mainSheet.score);
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

function toggleAddNoteMode()
{
    toggleMode(ADD_NOTE, "crosshair");
}

function toggleMode(newMode, cursor)
{
    if(newMode == mode)
    {
        mode = null;
        mainSheet.canvas.style.cursor = "default";
    }
    else
    {
        console.log("Entering mode:", newMode)
        mode = newMode;
        mainSheet.canvas.style.cursor = cursor;
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
    var note = mainSheet.score.notes[noteIndex];
    var sound = sounds[noteIndex];
    var expectedTime = Date.now() - startTime;
    var actualTime = note.time * (60 / mainSheet.score.bpm);
    console.log("> playNote():", actualTime - expectedTime / 1000.0);
    sound.play();
}

function stop()
{
    postMessageToSoundLoop("stop");
    startTime = null;
}

function record()
{
    mode = RECORD;
    postMessageToSoundLoop("playIntro");
}

function showImportDialogue()
{
    var scoreList = document.getElementById("dialogueScoreList");
    clearChildren(scoreList);
    var scores = readFile("scores-list.txt").trim().split("\n");
    for(var score of scores)
    {
        var button = document.createElement("button");
        button.innerHTML = score;
        button.addEventListener("click", selectImportScore);
        var item = document.createElement("li");
        scoreList.appendChild(item);
        item.appendChild(button);
    }
    importSheet.draw();
    var dialogue = showDialogue("importDialogue");
}

function clearChildren(node)
{
    while(node.firstChild != null)
    {
        node.removeChild(node.firstChild);
    }
}

function selectImportScore(event)
{
    var scoreName = this.innerHTML;
    var score = readScoreFromFile(scoreName);
    importSheet.score = score;
    importSheet.draw();
}

function showDialogue(id)
{
    document.getElementById("overlay").style.visibility = "visible";
    var dialogue = document.getElementById(id);
    dialogue.style.visibility = "visible";
    shownDialogue = id;
    return dialogue;
}

function importScore()
{
    closeDialogue();
    loadScore(importSheet.score);
}

function importNotes()
{
    closeDialogue();
    importedNotes = this.importSheet.selectedNotes;
}

function closeDialogue()
{
    document.getElementById("overlay").style.visibility = "hidden";
    document.getElementById(shownDialogue).style.visibility = "hidden";
    shownDialogue = null;
}

function cancelDialogue()
{
    closeDialogue();
}

function updateBpm(event)
{
    mainSheet.score.bpm = parseFloat(event.target.value);
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
    jsonRepresentation.value = JSON.stringify(mainSheet.score, null, 4);
}

function keyDown(event)
{
    if(mode == RECORD)
    {
        if(event.key in recordKeys && !recordKeys[event.key].down)
        {
            var time = ((Date.now() - startTime) / 1000) /
                mainSheet.calculateDuration() * mainSheet.score.beats;
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
        mainSheet.score = undoHistory.pop();
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
