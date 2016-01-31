var NOTE_SIZE = 5;
var CLOSE_DISTANCE = 20;
var ADD_NOTE = "ADD_NOTE";
var REMOVE_NOTE = "REMOVE_NOTE";
var RESIZE = "RESIZE";
var RECORD = "RECORD";
var FPS = 30;

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
var shownDialogue;
var importSheet;
var importedNotes = [];
var animateIntervalId;

function onLoad()
{
    jsonRepresentation = document.getElementById("jsonRepresentation");
    initSoundLoop();
    mainSheet = new MainSheet(document.getElementById("scoreCanvas"));
    loadScoreFromParameters();
    saveUndoState();
    clickSound = new Audio("sounds/repinique-head.ogg");
    var beatsInput = document.getElementById("beatsInput");
    beatsInput.addEventListener("input", updateBeats, false);
    beatsInput.value = mainSheet.score.beats;
    var bpmInput = document.getElementById("bpmInput");
    bpmInput.addEventListener("input", updateBpm, false);
    bpmInput.value = mainSheet.score.bpm;
    var animateCheckbox = document.getElementById("animateCheckbox");
    updateAnimate(animateCheckbox.checked);
    addEventListener("keydown", keyDown, false);
    addEventListener("keyup", keyUp, false);
    updateJson();
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
    for(var note of mainSheet.score.notes)
    {
        var sound = new Audio(mainSheet.score.noteTypes[note.type]);
        sounds.push(sound);
    }
}

function loadJsonFromRepresentation()
{
    var score = JSON.parse(jsonRepresentation.value);
    loadScore(score, false);
}

function loadImportScoreFromUrl()
{
    var urlInput = document.getElementById("importScoreUrlInput");
    var url = urlInput.value;
    var score = JSON.parse(readFile(url));
    loadImportScore(score);
}

function loadScoreFromParameters()
{
    var scoreName = getSearchParameter("score");
    if(scoreName != null)
    {
        loadScore(readScoreFromFile(scoreName));
        return true;
    }
    return false;
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

function loadScore(score, shouldJsonUpdate)
{
    mainSheet.score = score;
    beatsInput.value = mainSheet.score.beats;
    bpmInput.value = mainSheet.score.bpm;
    if(shouldJsonUpdate || shouldJsonUpdate == null)
    {
        updateJson();
    }
    updateScoreInSoundLoop();
    updateSounds();
    updateNoteTypeButtons()
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

function updateAnimate(animate)
{
    if(animate)
    {
        animateIntervalId = setInterval(draw, 1000 / FPS);
    }
    else
    {
        clearInterval(animateIntervalId);
    }
}

function toggleAnimate(event)
{
    updateAnimate(event.target.checked);
}

function updateScoreInSoundLoop()
{
    postMessageToSoundLoop("score", mainSheet.score);
}

function updateNoteTypeButtons()
{
    var noteTypeList = document.getElementById("noteTypeList");
    var spacing = noteTypeList.clientHeight /
        mainSheet.score.noteTypes.length / 2;
    clearChildren(noteTypeList);
    for(var i = 0; i < mainSheet.score.noteTypes.length; i ++)
    {
        var button = document.createElement("button");
        var noteType = mainSheet.score.noteTypes[i];
        button.innerHTML = getNoteTypeNameFromPath(noteType);
        button.noteTypeIndex = i;
        button.addEventListener("click", editNoteType);
        var item = document.createElement("li");
        noteTypeList.appendChild(item);
        item.appendChild(button);
        var buttonSpacing = spacing - button.clientHeight / 2;
        item.style.margin = buttonSpacing + "px 0px 0px 0px";
    }
}

function getNoteTypeNameFromPath(noteTypePath)
{
    return noteTypePath.replace(/.*\/(.*)\..*/, "$1")
}

function editNoteType(event)
{
    showEditNoteTypeDialogue(this.noteTypeIndex);
}

function showEditNoteTypeDialogue(noteTypeIndex)
{
    document.getElementById("editNoteTypeName").innerHTML =
        getNoteTypeNameFromPath(mainSheet.score.noteTypes[noteTypeIndex]);
    var noteTypeList = document.getElementById("editNoteTypeList");
    var noteTypes = readFile("note-type-list.txt").trim().split("\n");
    populateButtonList(noteTypeList, noteTypes, changeNoteType, noteTypeIndex);
    showDialogue("editNoteTypeDialogue");
}

function changeNoteType(event, noteTypeIndex)
{
    var newNoteType = "sounds/" + event.target.innerHTML + ".ogg";
    mainSheet.changeNoteType(noteTypeIndex[0], newNoteType);
    updateJson();
    updateSounds();
    updateNoteTypeButtons();
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
    var expectedTime = note.time * (60 / mainSheet.score.bpm);
    var actualTime = (Date.now() - startTime) / 1000.0;
    console.log("> playNote():", actualTime - expectedTime);
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
    var scores = readFile("score-list.txt").trim().split("\n");
    populateButtonList(scoreList, scores, selectImportScore);
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

function populateButtonList(listElement, items, onClickFunction, ...args)
{
    clearChildren(listElement);
    for(var item of items)
    {
        var button = document.createElement("button");
        button.innerHTML = item;
        button.addEventListener("click", function(event)
                                {onClickFunction(event, args)});
        var itemElement = document.createElement("li");
        listElement.appendChild(itemElement);
        itemElement.appendChild(button);
    }
}

function selectImportScore(event)
{
    var scoreName = event.target.innerHTML;
    var score = readScoreFromFile(scoreName);
    loadImportScore(score);
}

function loadImportScore(score)
{
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

function updateBeats(event)
{
    mainSheet.score.beats = parseFloat(event.target.value);
    updateScoreInSoundLoop();
    updateJson();
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
            var note = {time: time, type: recordKeys[event.key].noteType};
            mainSheet.addNote(note);
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
    mainSheet.draw();
}
