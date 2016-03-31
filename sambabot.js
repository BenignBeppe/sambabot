var NOTE_SIZE = 5;
var CLOSE_DISTANCE = 20;
var ADD_NOTE = "ADD_NOTE";
var REMOVE_NOTE = "REMOVE_NOTE";
var RESIZE = "RESIZE";
var FPS = 30;

var mainSheet;
var startTime;
var mode;
var clickSound;
var jsonRepresentation;
var recordKeys = {
    KeyJ: {noteType: 0, down: false},
    KeyK: {noteType: 1, down: false},
    KeyF: {noteType: 2, down: false}
}
var undoHistory = [];
var shownDialogue;
var importSheet;
var copiedNotes = [];
var pastedNotes = [];
var requestAnimationId;
var playing = false;
var recording = false;
var audioPlayer;
var donePlayingTimeout;
var startBeat = 1;
var endBeat = 0;

function onLoad()
{
    mobile = isMobile();
    jsonRepresentation = document.getElementById("jsonRepresentation");
    mainSheet = new MainSheet(document.getElementById("mainSheet"));
    mainSheet.changeScore({beats: 4, bpm: 90, noteTypes: [], notes: []});
    audioPlayer = new WebAudioApiPlayer();
    loadScoreFromParameters();
    saveUndoState();
    clickSound = new Audio("sounds/repinique-head.ogg");
    var startInput = document.getElementById("startInput");
    startInput.addEventListener(
        "input", function(e) {setStartBeat(parseInt(e.target.value));}, false);
    var endInput = document.getElementById("endInput");
    endInput.addEventListener(
        "input", function(e) {setEndBeat(parseInt(e.target.value));}, false);
    var beatsInput = document.getElementById("beatsInput");
    beatsInput.addEventListener("input", updateBeats, false);
    beatsInput.value = mainSheet.score.beats;
    var bpmInput = document.getElementById("bpmInput");
    bpmInput.addEventListener("input", updateBpm, false);
    bpmInput.value = mainSheet.score.bpm;
    addEventListener("keydown", keyDown, false);
    addEventListener("keyup", keyUp, false);
    updateJson();
    importSheet = new ImportSheet(
        document.getElementById("importSheet"));
    importSheet.changeScore({beats: 4, bpm: 90, noteTypes: [], notes: []});
    updateNoteTypeButtons();
}

function loadScoreFromParameters()
{
    var scoreName = getSearchParameter("score");
    if(scoreName != null)
    {
        readScoreFromFile(scoreName, function(score) {
            loadScore(score);
        });
    }
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
    saveUndoState();
    mainSheet.changeScore(score);
    beatsInput.value = mainSheet.score.beats;
    bpmInput.value = mainSheet.score.bpm;
    setStartBeat(1);
    setEndBeat(0);
    if(shouldJsonUpdate || shouldJsonUpdate == null)
    {
        updateJson();
    }
    audioPlayer.updateSounds();
    updateNoteTypeButtons()
}

function readScoreFromFile(scoreName, callback)
{
    var scorePath = "scores/" + scoreName + ".json";
    readFile(scorePath, function(content) {
        var score = JSON.parse(content);
        callback(score);
    });
}

function readFile(path, callback)
{
    var request = new XMLHttpRequest();
    request.open("GET", path);
    request.onreadystatechange = function() {
        var content = request.response;
        callback(content);
    };
    request.send();
}

function saveUndoState()
{
    undoHistory.push(JSON.parse(JSON.stringify(mainSheet.score)));
    console.log("Saving undo state. # of states now:", undoHistory.length);
}

function isMobile()
{
    return location.pathname.match(/[^\/]+$/)[0] == "mobile-index.html";
}

function updateNoteTypeButtons()
{
    var noteTypeList = document.getElementById("noteTypeList");
    var spacing = noteTypeList.clientHeight /
        mainSheet.score.noteTypes.length / 2;
    readFile("note-type-list.txt", function(content) {
        var noteTypes = content.trim().split("\n");
        var noteTypeNames = [];
        for(var path of mainSheet.score.noteTypes)
        {
            var name = getNoteTypeNameFromPath(path);
            noteTypeNames.push(name);
        }
        if(mobile)
        {
            noteTypeNames = [];
            for(var i in mainSheet.score.noteTypes)
            {
                noteTypeNames.push(i);
            }
        }
        var buttons = populateButtonList(
            noteTypeList, noteTypeNames,
            function(event) {
                showEditNoteTypeDialogue(event.target.noteTypeIndex);});
        for(var i = 0; i < buttons.length; i ++)
        {
            var button = buttons[i];
            button.noteTypeIndex = i;
            var spacing = noteTypeList.clientHeight /
                mainSheet.score.noteTypes.length / 2;
            var buttonSpacing = spacing - button.clientHeight / 2;
            button.style.margin = buttonSpacing + "px 0px 0px 0px";
        }
        createAddNoteTypeButton();
    });
}

function createAddNoteTypeButton()
{
    var button = document.createElement("button");
    var icon = document.createElement("i");
    icon.classList.add("fa");
    icon.classList.add("fa-plus");
    button.appendChild(icon);
    button.addEventListener("click", showAddNoteTypeDialogue);
    var item = document.createElement("li");
    var noteTypeList = document.getElementById("noteTypeList");
    noteTypeList.appendChild(item);
    item.appendChild(button);
    var spacing = noteTypeList.clientHeight /
        mainSheet.score.noteTypes.length / 2;
    var buttonSpacing = spacing - button.clientHeight / 2;
    item.style.margin = buttonSpacing + "px 0px 0px 0px";
    return button;
}

function getNoteTypeNameFromPath(noteTypePath)
{
    return noteTypePath.replace(/.*\/(.*)\..*/, "$1")
}

function showEditNoteTypeDialogue(noteTypeIndex)
{
    document.getElementById("editNoteTypeName").innerHTML =
        getNoteTypeNameFromPath(mainSheet.score.noteTypes[noteTypeIndex]);
    var noteTypeList = document.getElementById("editNoteTypeList");
    readFile("note-type-list.txt", function(content) {
        var noteTypes = content.trim().split("\n");
        var buttons = populateButtonList(
            noteTypeList, noteTypes, changeNoteType, noteTypeIndex);
        for(var i = 0; i < buttons.length; i ++)
        {
            buttons[i].noteTypePath = noteTypes[i];
        }
        showDialogue("editNoteTypeDialogue");
    });
}

function changeNoteType(event, noteTypeIndex)
{
    mainSheet.changeNoteType(noteTypeIndex[0], event.target.noteTypePath);
    closeDialogue();
    updateJson();
    updateNoteTypeButtons();
    audioPlayer.updateSounds();
}

function showAddNoteTypeDialogue(event)
{
    var noteTypeList = document.getElementById("addNoteTypeList");
    readFile("note-type-list.txt", function(content) {
        var noteTypes = content.trim().split("\n");
        var noteTypeNames = [];
        for(var path of noteTypes)
        {
            var name = getNoteTypeNameFromPath(path);
            noteTypeNames.push(name);
        }
        var buttons = populateButtonList(noteTypeList, noteTypeNames,
                                         addNoteType);
        for(var i = 0; i < buttons.length; i ++)
        {
            buttons[i].noteTypePath = noteTypes[i];
        }
        showDialogue("addNoteTypeDialogue");
    });
}

function addNoteType(event)
{
    var path = event.target.noteTypePath;
    mainSheet.addNoteType(path);
    updateJson();
    updateNoteTypeButtons();
    audioPlayer.updateSounds();
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
    readFile(url, function(content) {
        var score = JSON.parse(content);
        loadImportScore(score);
    });
}

function toggleMode(newMode)
{
    if(newMode == mode)
    {
        exitMode();
    }
    else
    {
        enterMode(newMode);
    }
}

function exitMode()
{
    console.log("Exiting mode:", mode)
    mode = null;
    mainSheet.area.style.cursor = "default";
    updateModeButtonStates();
}

function enterMode(newMode)
{
    exitMode();
    console.log("Entering mode:", newMode)
    mode = newMode;
    if(mode == ADD_NOTE || mode == REMOVE_NOTE)
    {
        mainSheet.deselectNotes();
    }
    if(mode == ADD_NOTE)
    {
        mainSheet.area.style.cursor = "crosshair";
    }
    else if(mode == RESIZE)
    {
        mainSheet.area.style.cursor = "ew-resize";
    }
    else
    {
        mainSheet.area.style.cursor = "default";
    }
    updateModeButtonStates();
}

function updateModeButtonStates()
{
    var buttons = document.getElementsByClassName("modeButton");
    for(var i = 0; i < buttons.length; i ++)
    {
        var button = buttons.item(i);
        button.classList.remove("down");
    }
    var downButton;
    if(mode == ADD_NOTE)
    {
        downButton = document.getElementById("addNoteButton");
    }
    else if(mode == REMOVE_NOTE)
    {
        downButton = document.getElementById("removeNoteButton");
    }
    else if(mode == RESIZE)
    {
        downButton = document.getElementById("resizeButton");
    }
    if(downButton != null)
    {
        downButton.classList.add("down");
    }
}

function play(looping)
{
    stop();
    var endTime = toSeconds(endBeat + 1 - startBeat) * 1000;
    if(looping)
    {
        donePlayingTimeout = setTimeout(play, endTime, true);
    }
    else
    {
        donePlayingTimeout = setTimeout(stop, endTime);
    }
    startTime = Date.now();
    playing = true;
    audioPlayer.play(looping);
    requestAnimationId = requestAnimationFrame(draw);
}

function toSeconds(timeInBeats)
{
    return timeInBeats * (60 / mainSheet.score.bpm);
}

function stop()
{
    audioPlayer.stop();
    clearTimeout(donePlayingTimeout);
    startTime = null;
    playing = false;
    recording = false;
    mainSheet.layers.timeMarker.clear();
    cancelAnimationFrame(requestAnimationId);
}

function record()
{
    recrding = true;
    playIntro();
    setTimeout(function() {play(); recording = true;}, toSeconds(4) * 1000);
}

function playIntro()
{
    playClick();
    setTimeout(playClick, toSeconds(1) * 1000);
    setTimeout(playClick, toSeconds(2) * 1000);
    setTimeout(playClick, toSeconds(3) * 1000);
}

function playClick()
{
    clickSound.load();
    clickSound.play();
}

function showImportDialogue()
{
    var scoreList = document.getElementById("dialogueScoreList");
    readFile("score-list.txt", function(content) {
        scores = content.trim().split("\n");
        populateButtonList(scoreList, scores, selectImportScore);
        var dialogue = showDialogue("importDialogue");
    });
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
    var buttons = [];
    for(var item of items)
    {
        var button = document.createElement("button");
        button.innerHTML = item;
        button.addEventListener("click", function(event)
                                {onClickFunction(event, args)});
        var itemElement = document.createElement("li");
        listElement.appendChild(itemElement);
        itemElement.appendChild(button);
        buttons.push(button);
    }
    return buttons;
}

function selectImportScore(event)
{
    var scoreName = event.target.innerHTML;
    var score = readScoreFromFile(
        scoreName,
        function(score) {loadImportScore(score);});
}

function loadImportScore(score)
{
    importSheet.changeScore(score);
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
    copiedNotes = importSheet.selectedNotes;
    pasteNotes();
}

function closeDialogue()
{
    document.getElementById("overlay").style.visibility = "hidden";
    document.getElementById(shownDialogue).style.visibility = "hidden";
    shownDialogue = null;
}

function setStartBeat(value)
{
    startBeat = value;
    startInput.value = value;
    if(startBeat > endBeat)
    {
        setEndBeat(startBeat);
    }
    mainSheet.layers.playRange.draw();
}

function setEndBeat(value)
{
    endInput.value = value;
    if(value == 0)
    {
        endBeat = mainSheet.score.beats;
    }
    else
    {
        endBeat = value;
        if(endBeat < startBeat)
        {
            setStartBeat(endBeat);
        }
    }
    mainSheet.layers.playRange.draw();
}

function updateBeats(event)
{
    mainSheet.setBeats(parseFloat(event.target.value));
}

function updateBpm(event)
{
    mainSheet.score.bpm = parseFloat(event.target.value);
    updateJson();
}

function updateJson()
{
    jsonRepresentation.value = JSON.stringify(mainSheet.score, null, 4);
}

function keyDown(event)
{
    if(recording)
    {
        if(event.code in recordKeys && !recordKeys[event.code].down)
        {
            var secondsPlayed = (Date.now() - startTime) / 1000;
            var beatsPlayed = mainSheet.secondsToBeats(secondsPlayed);
            var time = beatsPlayed + startBeat - 1
            var note = {time: time, type: recordKeys[event.code].noteType};
            mainSheet.addNotes([note]);
            recordKeys[event.code].down = true;
            this.audioPlayer.playNote(note, true);
        }
    }
    else
    {
        if(event.code == "Delete")
        {
            mainSheet.removeSelectedNotes();
        }
        else if(event.code == "KeyZ" && event.ctrlKey)
        {
            undo();
        }
        else if(event.code == "KeyC" && event.ctrlKey)
        {
            copyNotes();
        }
        else if(event.code == "KeyV" && event.ctrlKey)
        {
            pasteNotes();
        }
        else if(event.code == "Escape")
        {
            mainSheet.deselectNotes();
            pastedNotes = [];
            mainSheet.layers.note.draw();
            mainSheet.layers.grid.draw();
        }
    }
}

function undo()
{
    if(undoHistory.length > 0)
    {
        mainSheet.changeScore(undoHistory.pop());
        audioPlayer.updateSounds();
        updateJson();
        updateNoteTypeButtons();
    }
}

function copyNotes()
{
    copiedNotes = mainSheet.selectedNotes;
}

function pasteNotes()
{
    pastedNotes = copiedNotes;
}

function keyUp(event)
{
    if(event.code in recordKeys)
    {
        recordKeys[event.code].down = false;
    }
}

function draw()
{
    mainSheet.layers.timeMarker.draw();
    requestAnimationId = requestAnimationFrame(draw);
}
