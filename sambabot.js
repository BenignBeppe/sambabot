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
    j: {noteType: 0, down: false},
    k: {noteType: 1, down: false},
    f: {noteType: 2, down: false}
}
var undoHistory = [];
var shownDialogue;
var importSheet;
var copiedNotes = [];
var pastedNotes = [];
var animateIntervalId;
var playing = false;
var recording = false;
var audioPlayer;
var donePlayingTimeout;

function onLoad()
{
    jsonRepresentation = document.getElementById("jsonRepresentation");
    mainSheet = new MainSheet(document.getElementById("mainScoreCanvas"));
    audioPlayer = new WebAudioApiPlayer();
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
    updateNoteTypeButtons();
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
    saveUndoState();
    mainSheet.changeScore(score);
    beatsInput.value = mainSheet.score.beats;
    bpmInput.value = mainSheet.score.bpm;
    if(shouldJsonUpdate || shouldJsonUpdate == null)
    {
        updateJson();
    }
    audioPlayer.updateSounds();
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

function updateNoteTypeButtons()
{
    var noteTypeList = document.getElementById("noteTypeList");
    var spacing = noteTypeList.clientHeight /
        mainSheet.score.noteTypes.length / 2;
    var noteTypes = readFile("note-type-list.txt").trim().split("\n");
    var noteTypeNames = [];
    for(var path of mainSheet.score.noteTypes)
    {
        var name = getNoteTypeNameFromPath(path);
        noteTypeNames.push(name);
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
    var noteTypes = readFile("note-type-list.txt").trim().split("\n");
    var buttons = populateButtonList(noteTypeList, noteTypes, changeNoteType,
                                     noteTypeIndex);
    for(var i = 0; i < buttons.length; i ++)
    {
        buttons[i].noteTypePath = noteTypes[i];
    }
    showDialogue("editNoteTypeDialogue");
}

function changeNoteType(event, noteTypeIndex)
{
    mainSheet.changeNoteType(noteTypeIndex[0], event.target.noteTypePath);
    closeDialogue();
}

function showAddNoteTypeDialogue(event)
{
    var noteTypeList = document.getElementById("addNoteTypeList");
    var noteTypes = readFile("note-type-list.txt").trim().split("\n");
    var noteTypeNames = [];
    for(var path of noteTypes)
    {
        var name = getNoteTypeNameFromPath(path);
        noteTypeNames.push(name);
    }
    var buttons = populateButtonList(noteTypeList, noteTypeNames, addNoteType);
    for(var i = 0; i < buttons.length; i ++)
    {
        buttons[i].noteTypePath = noteTypes[i];
    }
    showDialogue("addNoteTypeDialogue");
}

function addNoteType(event)
{
    var path = event.target.noteTypePath;
    mainSheet.addNoteType(path);
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
    mainSheet.canvas.style.cursor = "default";
}

function enterMode(newMode)
{
    console.log("Entering mode:", newMode)
    mode = newMode;
    if(mode == ADD_NOTE || mode == REMOVE_NOTE)
    {
        this.mainSheet.deselectNotes();
    }
    if(mode == ADD_NOTE)
    {
        mainSheet.canvas.style.cursor = "crosshair";
    }
    if(mode == RESIZE)
    {
        mainSheet.canvas.style.cursor = "ew-resize";
    }
    else
    {
        mainSheet.canvas.style.cursor = "default";
    }
}

function play(looping)
{
    stop();
    if(looping)
    {
        donePlayingTimeout = setTimeout(
            play, toSeconds(mainSheet.score.beats) * 1000, true);
    }
    else
    {
        donePlayingTimeout = setTimeout(
            stop, toSeconds(mainSheet.score.beats) * 1000);
    }
    startTime = Date.now();
    playing = true;
    audioPlayer.play(looping);
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
    var score = readScoreFromFile(scoreName);
    loadImportScore(score);
}

function loadImportScore(score)
{
    importSheet.changeScore(score);
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
    copiedNotes = this.importSheet.selectedNotes;
    pasteNotes();
}

function closeDialogue()
{
    document.getElementById("overlay").style.visibility = "hidden";
    document.getElementById(shownDialogue).style.visibility = "hidden";
    shownDialogue = null;
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
        else if(event.key == "z" && event.ctrlKey)
        {
            undo();
        }
        else if(event.key == "c" && event.ctrlKey)
        {
            copyNotes();
        }
        else if(event.key == "v" && event.ctrlKey)
        {
            pasteNotes();
        }
        else if(event.key == "Escape")
        {
            mainSheet.deselectNotes();
            pastedNotes = [];
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
    copiedNotes = this.mainSheet.selectedNotes;
}

function pasteNotes()
{
    pastedNotes = copiedNotes;
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
