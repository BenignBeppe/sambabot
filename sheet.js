var MAIN_COLOUR = "rgb(0, 0, 0)";
var HIGHLIGHT_COLOUR = "rgb(255, 0, 0)";
var IMPORT_COLOUR = "rgb(0, 255, 255)";
var BEAT_WIDTH = 100;

function Sheet(canvas)
{
    this.canvas = canvas;
    this.context = this.canvas.getContext("2d");
    this.score = {beats: 4, bpm: 90, noteTypes: [], notes: []};
    this.highlightedBeat;
    this.selectionStartPoint;
    this.selectedNotes = [];
    this.clickedNote;
    this.highlightedNote;
    this.firstNote;

    this.draw = function()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawNoteLines();
        this.drawBeatLines();
        this.drawNotes();
        this.drawSelectionRectangle();
    }

    this.drawNoteLines = function()
    {
        for(var i = 0; i < this.numberOfNoteTypes(); i ++)
        {
            this.drawNoteLine(i);
        }
    }

    this.numberOfNoteTypes = function()
    {
        return Object.keys(this.score.noteTypes).length
    }

    this.drawNoteLine = function(index)
    {
        y = this.calculateNoteTypeY(index);
        this.context.strokeStyle = MAIN_COLOUR;
        this.drawLine(0, y, this.canvas.width, y, 1);
    }

    this.calculateNoteTypeY = function(noteType)
    {
        var gapSize = this.canvas.height / (this.numberOfNoteTypes() + 1);
        return gapSize * (noteType + 1);
    }

    this.drawLine = function(startX, startY, endX, endY, width)
    {
        this.context.beginPath();
        this.context.lineWidth = width;
        this.context.moveTo(startX, startY);
        this.context.lineTo(endX, endY);
        this.context.stroke();
    }

    this.drawBeatLines = function()
    {
        this.context.strokeStyle = MAIN_COLOUR;
        for(var i = 1; i < this.score.beats; i ++)
        {
            this.drawBeatLine(i);
        }
    }

    this.drawBeatLine = function(index)
    {
        var x = (this.canvas.width / (this.score.beats / index));
        this.drawLine(x, 0, x, this.canvas.height, 1);
    }

    this.drawNotes = function()
    {
        for(var note of this.score.notes)
        {
            if(this.highlightedNote == note)
            {
                var x = this.calculateNoteX(note);
                var y = this.calculateNoteY(note);
                this.context.strokeStyle = HIGHLIGHT_COLOUR;
                this.strokeCircle(x, y, NOTE_SIZE, 3);
            }
            if(this.selectedNotes.indexOf(note) != -1)
            {
                this.drawNote(note, HIGHLIGHT_COLOUR);
            }
            else
            {
                this.drawNote(note);
            }
        }
    }

    this.drawNote = function(note, colour)
    {
        if(colour == null)
        {
            colour = MAIN_COLOUR;
        }
        this.context.fillStyle = colour;
        var x = this.calculateNoteX(note);
        var y = this.calculateNoteY(note);
        this.fillCircle(x, y, NOTE_SIZE);
    }

    this.calculateNoteX = function(note)
    {
        var x = this.timeToX(note.time);
        return x;
    }

    this.timeToX = function(time)
    {
        var x = time / this.score.beats * this.canvas.width;
        return x;
    }

    this.calculateNoteY = function(note)
    {
        return this.calculateNoteTypeY(note.type);
    }

    this.strokeCircle = function(x, y, r, width)
    {
        this.context.beginPath();
        this.context.arc(x, y, r, 0, 2 * Math.PI);
        this.context.lineWidth = width;
        this.context.stroke();
    }

    this.fillCircle = function(x, y, r)
    {
        this.context.beginPath();
        this.context.arc(x, y, r, 0, 2 * Math.PI);
        this.context.fill();
    }

    this.drawSelectionRectangle = function()
    {
        if(this.selectionStartPoint != null)
        {
            this.context.beginPath();
            this.context.lineWidth = 1;
            this.context.rect(
                this.selectionStartPoint.x,
                this.selectionStartPoint.y,
                this.selectionEndPoint.x - this.selectionStartPoint.x,
                this.selectionEndPoint.y - this.selectionStartPoint.y);
            this.context.stroke();
        }
    }

    this.calculateDuration = function()
    {
        return this.score.beats / this.score.bpm * 60;
    }

    this.xInCanvas = function(rawX)
    {
        return rawX - this.canvas.offsetLeft +
            this.canvas.parentElement.scrollLeft + document.body.scrollLeft;
    }

    this.yInCanvas = function(rawY)
    {
        return rawY - this.canvas.offsetTop + document.body.scrollTop;
    }

    this.calculateNoteTime = function(x)
    {
        return (x / this.canvas.width) * this.score.beats;
    }

    this.moveSelectedNotes = function(deltaX)
    {
        for(var note of this.selectedNotes)
        {
            this.moveNote(note, deltaX);
        }
    }

    this.xToTime = function(x)
    {
        var time = x  * this.score.beats / this.canvas.width;
        return time;
    }

    this.calculateDuration = function()
    {
        return this.score.beats / this.score.bpm * 60;
    }

    this.getBeatContainingX = function(x)
    {
        var time = this.xToTime(x);
        var beat = Math.floor(time);
        return beat;
    }

    this.startSelection = function(event)
    {
        var x = this.xInCanvas(event.clientX);
        var y = this.yInCanvas(event.clientY);
        this.clickedNote = this.withinNote(x, y);
        if(this.clickedNote != null)
        {
            if(this.selectedNotes.indexOf(this.clickedNote) == -1)
            {
                if(!event.shiftKey)
                {
                    this.deselectNotes();
                }
                this.selectNote(this.clickedNote);
            }
        }
        else
        {
            this.deselectNotes();
            this.selectionStartPoint = {x: x, y: y};
            this.selectionEndPoint = {x: x, y: y};
        }
    }

    this.withinNote = function(x, y)
    {
        for(var note of this.score.notes)
        {
            var a = Math.abs(x - this.calculateNoteX(note));
            var b = Math.abs(y - this.calculateNoteY(note));
            var distance = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
            if(distance < NOTE_SIZE)
            {
                return note;
            }
        }
    }

    this.selectNote = function(note)
    {
        if(this.selectedNotes.indexOf(note) == -1)
        {
            this.selectedNotes.push(note);
            if(this.firstNote == null || note.time < this.firstNote.time)
            {
                this.firstNote = note;
            }
        }
    }

    this.selectNotesInRectangle = function()
    {
        var firstNoteTime = null;
        for(var note of this.score.notes)
        {
            var x = this.calculateNoteX(note);
            var y = this.calculateNoteY(note);
            var minX = Math.min(this.selectionStartPoint.x,
                                this.selectionEndPoint.x);
            var maxX = Math.max(this.selectionStartPoint.x,
                                this.selectionEndPoint.x);
            var minY = Math.min(this.selectionStartPoint.y,
                                this.selectionEndPoint.y);
            var maxY = Math.max(this.selectionStartPoint.y,
                                this.selectionEndPoint.y);
            if(x > minX && x < maxX && y > minY && y < maxY)
            {
                this.selectNote(note);
                if(firstNoteTime == null || note.time < firstNoteTime)
                {
                    this.firstNote = note;
                    firstNoteTime = note.time;
                }
            }
        }
    }

    this.updateSelection = function(x, y)
    {
        if(this.selectionStartPoint != null)
        {
            this.selectionEndPoint.x = x;
            this.selectionEndPoint.y = y;
        }
        else
        {
            this.highlightedNote = this.withinNote(x, y);
        }
    }

    this.deselectNotes = function()
    {
        this.selectedNotes = [];
    }

    this.changeScore = function(score)
    {
        this.score = score;
        this.updateWidth();
    }

    this.updateWidth = function()
    {
        this.canvas.width = this.score.beats * BEAT_WIDTH;
    }
}

function MainSheet(canvas)
{
    Sheet.call(this, canvas);
    this.highlightedNoteLine;
    this.notesMoved = false;
    this.beatHoveredOver;
    this.canvas.sheet = this;
    this.canvas.addEventListener("mousemove",
                                 function(e){this.sheet.mouseMove(e)},
                                 false);
    this.canvas.addEventListener("mousedown",
                                 function(e){this.sheet.mouseDown(e)},
                                 false);
    this.canvas.addEventListener("mouseup",
                                 function(e){this.sheet.mouseUp(e)},
                                 false);

    this.superDraw = this.draw;
    this.draw = function()
    {
        this.superDraw();
        if(importSheet.selectedNotes.length > 0)
        {
            for(var note of importedNotes)
            {
                var adjustedNote = this.adjustNote(note);
                this.drawNote(adjustedNote, IMPORT_COLOUR);
            }
        }
        this.drawTimeMarker();
    }

    this.adjustNote = function(note)
    {
        var startBeat = Math.floor(importSheet.firstNote.time);
        var adjustedTime = note.time - startBeat + this.beatHoveredOver;
        var adjustedNote = {time: adjustedTime, type: note.type}
        return adjustedNote;
    }

    this.drawNoteLine = function(index)
    {
        y = this.calculateNoteTypeY(index);
        if(this.highlightedNoteLine == index)
        {
            this.context.strokeStyle = HIGHLIGHT_COLOUR;
        }
        else
        {
            this.context.strokeStyle = MAIN_COLOUR;
        }
        this.drawLine(0, y, this.canvas.width, y, 1);
    }

    this.drawTimeMarker = function()
    {
        var time = Date.now();
        var x = (((time - startTime) / 1000.0) / this.calculateDuration()) *
            this.canvas.width;
        this.context.strokeStyle = MAIN_COLOUR;
        this.drawLine(x, 0, x, this.canvas.height, 2);
        if(playing || mode == RECORD)
        {
            this.scrollToCenterX(x);
        }
    }

    this.scrollToCenterX = function(x)
    {
        this.canvas.parentElement.scrollLeft =
            x - this.canvas.parentElement.clientWidth / 2;
    }

    this.mouseMove = function(event)
    {
        var x = this.xInCanvas(event.clientX);
        var y = this.yInCanvas(event.clientY);
        if(mode == ADD_NOTE)
        {
            this.highlightedNoteLine = this.closeToNoteLine(y);
        }
        else if(mode == REMOVE_NOTE)
        {
            this.highlightedNote = this.withinNote(x, y);
        }
        else if(mode == RESIZE && event.buttons == 1 &&
                this.selectedNotes.length > 0)
        {
            this.saveUndoStateBeforeNotesAreMoved();
            for(var note of this.selectedNotes)
            {
                var deltaX = event.movementX *
                    ((note.time - this.firstNote.time) /
                     (this.clickedNote.time - this.firstNote.time));
                this.moveNote(note, deltaX);
            }
        }
        else if(this.selectedNotes.length > 0)
        {
            if(event.buttons == 1)
            {
                this.saveUndoStateBeforeNotesAreMoved();
                this.moveSelectedNotes(event.movementX);
            }
            else
            {
                this.highlightedNoteLine = this.closeToNoteLine(y);
            }
        }
        if(this.selectionStartPoint != null)
        {
            this.selectionEndPoint.x = x;
            this.selectionEndPoint.y = y;
        }
        else
        {
            this.highlightedNote = this.withinNote(x, y);
        }
        if(this.highlightedNote == null)
        {
            this.beatHoveredOver = this.getBeatContainingX(x);
        }
        else
        {
            this.highlightedNoteLine = null;
        }
    }

    this.closeToNoteLine = function(y)
    {
        var closestNoteLine;
        var closestDistance;
        for(var i = 0; i < Object.keys(this.score.noteTypes).length; i ++)
        {
            var noteLineY = this.calculateNoteTypeY(i);
            var distance = Math.abs(noteLineY - y);
            if(distance < CLOSE_DISTANCE)
            {
                closestNoteLine = i;
                closestDistance = distance;
            }
        }
        return closestNoteLine;
    }

    this.mouseDown = function(event)
    {
        var x = this.xInCanvas(event.clientX);
        var y = this.yInCanvas(event.clientY);
        if(mode == ADD_NOTE)
        {
            if(this.highlightedNoteLine == null)
            {
                toggleAddNoteMode();
            }
            else
            {
                var time = this.xToTime(x);
                this.addNote({time: time, type: this.highlightedNoteLine});
                updateScoreInSoundLoop();
            }
        }
        else if(mode == REMOVE_NOTE)
        {
            if(this.highlightedNote == null)
            {
                mode = null;
            }
            else
            {
                this.removeNotes([this.highlightedNote]);
            }
        }
        else if(importSheet.selectedNotes.length > 0)
        {
            this.addImportedNotes();
            updateScoreInSoundLoop();
            importSheet.selectedNotes = [];
        }
        else if(this.selectedNotes.length > 0 &&
                this.highlightedNoteLine != null)
        {
            this.changeNoteTypeForSelectedNotes(this.highlightedNoteLine);
        }
        else
        {
            this.startSelection(event);
        }
    }

    this.addNote = function(note)
    {
        saveUndoState();
        this.score.notes.push(note);
        var path = this.score.noteTypes[note.type];
        addSound(path);
    }

    this.removeNotes = function(notes)
    {
        saveUndoState();
        for(var note of notes)
        {
            var index = this.score.notes.indexOf(note);
            this.score.notes.splice(index, 1);
            sounds.splice(index, 1);
        }
        updateScoreInSoundLoop();
        updateJson();
    }

    this.addImportedNotes = function()
    {
        var startBeat = Math.floor(importSheet.firstNote.time);
        for(var note of importSheet.selectedNotes)
        {
            var adjustedNote = this.adjustNote(note);
            this.addNote(adjustedNote);
        }
    }

    this.changeNoteTypeForSelectedNotes = function(noteType)
    {
        saveUndoState();
        for(var note of this.selectedNotes)
        {
            note.type = noteType;
        }
        updateJson();
        updateSounds();
    }

    this.saveUndoStateBeforeNotesAreMoved = function()
    {
        if(!this.notesMoved)
        {
            this.notesMoved = true;
            saveUndoState();
        }
    }

    this.moveNote = function(note, deltaX)
    {
        note.time += this.calculateNoteTime(deltaX);
    }

    this.mouseUp = function(event)
    {
        if(this.selectionStartPoint != null)
        {
            this.selectNotesInRectangle();
            this.selectionStartPoint = null;
            this.selectionEndPoint = null;
        }
        if(this.notesMoved)
        {
            updateScoreInSoundLoop();
            updateJson();
            this.notesMoved = false;
        }
        this.clickedNote = null;
    }

    this.removeSelectedNotes = function()
    {
        this.removeNotes(this.selectedNotes);
        this.deselectNotes();
    }

    this.changeNoteType = function(noteTypeIndex, newNoteType)
    {
        saveUndoState();
        this.score.noteTypes[noteTypeIndex] = newNoteType;
        updateJson();
        updateSounds();
        updateNoteTypeButtons();
    }

    this.addNoteType = function(noteType)
    {
        saveUndoState();
        this.score.noteTypes.push(noteType);
        updateJson();
        updateNoteTypeButtons();
    }

    this.setBeats = function(beats)
    {
        saveUndoState();
        this.score.beats = beats;
        this.updateWidth();
        updateScoreInSoundLoop();
        updateJson();
    }
}

function ImportSheet(canvas)
{
    Sheet.call(this, canvas);
    this.canvas.sheet = this;
    this.canvas.addEventListener("mousemove",
                                 function(e){this.sheet.mouseMove(e)},
                                 false);
    this.canvas.addEventListener("mousedown",
                                 function(e){this.sheet.mouseDown(e)},
                                 false);
    this.canvas.addEventListener("mouseup",
                                 function(e){this.sheet.mouseUp(e)},
                                 false);

    this.mouseMove = function(event)
    {
        var x = this.xInCanvas(event.clientX);
        var y = this.yInCanvas(event.clientY);
        this.updateSelection(x, y);
        this.draw();
    }

    this.mouseDown = function(event)
    {
        var x = this.xInCanvas(event.clientX);
        var y = this.yInCanvas(event.clientY);
        this.startSelection(event);
    }

    this.mouseUp = function(event)
    {
        if(this.selectionStartPoint != null)
        {
            this.selectNotesInRectangle();
            this.selectionStartPoint = null;
            this.selectionEndPoint = null;
        }
    }

    this.superXInCanvas = this.xInCanvas;
    this.xInCanvas = function(rawX)
    {
        var dialogueOffset =
            document.getElementById("importDialogue").offsetLeft;
        return this.superXInCanvas(rawX) - dialogueOffset;
    }

    this.superYInCanvas = this.yInCanvas;
    this.yInCanvas = function(rawY)
    {
        var dialogueOffset =
            document.getElementById("importDialogue").offsetTop;
        return this.superYInCanvas(rawY) - dialogueOffset;
    }
}
