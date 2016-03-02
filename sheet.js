var MAIN_COLOUR = "rgb(0, 0, 0)";
var HIGHLIGHT_COLOUR = "rgb(255, 0, 0)";
var IMPORT_COLOUR = "rgb(0, 255, 255)";
var BEAT_WIDTH = 100;

function Sheet(area)
{
    this.area = area;
    this.highlightedBeat;
    this.selectionStartPoint;
    this.selectedNotes = [];
    this.clickedNote;
    this.highlightedNote;
    this.layers = {
        "grid": new GridLayer(this, this.area),
        "note": new NoteLayer(this, this.area),
        "selection": new SelectionLayer(this, this.area)};
    this.isMain = false;

    this.numberOfNoteTypes = function()
    {
        return Object.keys(this.score.noteTypes).length
    }

    this.calculateNoteTypeY = function(noteType)
    {
        var gapSize = this.area.clientHeight /
            (this.numberOfNoteTypes() + 1);
        return gapSize * (noteType + 1);
    }

    this.calculateNoteX = function(note)
    {
        var x = this.timeToX(note.time);
        return x;
    }

    this.timeToX = function(time)
    {
        var x = time / this.score.beats * this.area.clientWidth;
        return x;
    }

    this.calculateNoteY = function(note)
    {
        return this.calculateNoteTypeY(note.type);
    }

    this.calculateNoteTime = function(x)
    {
        return (x / this.area.clientWidth) * this.score.beats;
    }

    this.xToTime = function(x)
    {
        var time = x  * this.score.beats / this.area.clientWidth;
        return time;
    }

    this.startSelection = function(event)
    {
        var x = event.layerX;
        var y = event.layerY;
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
        this.layers.note.draw();
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
        }
    }

    this.selectNotesInRectangle = function()
    {
        if(this.selectionStartPoint != null)
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
                }
            }
            this.selectionStartPoint = null;
            this.selectionEndPoint = null;
            this.layers.selection.clear();
            this.layers.note.draw();
        }
    }

    this.updateSelection = function(x, y)
    {
        if(this.selectionStartPoint != null)
        {
            this.selectionEndPoint.x = x;
            this.selectionEndPoint.y = y;
            this.layers.selection.draw();
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
        var width = this.score.beats * BEAT_WIDTH;
        this.area.style.width = width + "px";
        for(var layerName in this.layers)
        {
            var layer = this.layers[layerName];
            layer.canvas.width = this.score.beats * BEAT_WIDTH;
        }
        this.layers.grid.draw();
        this.layers.note.draw();
        if(endInput.value == 0)
        {
            setEndBeat(0);
        }
        this.layers.playRange.draw();
    }
}

function MainSheet(area)
{
    Sheet.call(this, area);
    this.highlightedNoteLine;
    this.notesMoved = false;
    this.beatHoveredOver;
    this.area.sheet = this;
    this.isMain = true;
    this.area.addEventListener("mousemove",
                                 function(e){this.sheet.mouseMove(e)},
                                 false);
    this.area.addEventListener("mousedown",
                                 function(e){this.sheet.mouseDown(e)},
                                 false);
    this.area.addEventListener("mouseup",
                                 function(e){this.sheet.mouseUp(e)},
                                 false);
    this.layers["playRange"] = new PlayRangeLayer(this, this.area);
    this.layers["timeMarker"] = new TimeMarkerLayer(this, this.area);

    this.superDeselectNotes = this.deselectNotes;
    this.deselectNotes = function()
    {
        this.superDeselectNotes();
        this.highlightedNoteLine = null;
    }

    this.adjustNote = function(note)
    {
        var startBeat = Math.floor(this.getFirstNote(pastedNotes).time);
        var adjustedTime = note.time - startBeat + this.beatHoveredOver;
        var adjustedNote = {time: adjustedTime, type: note.type}
        return adjustedNote;
    }

    this.secondsToBeats = function(seconds)
    {
        return seconds * this.score.bpm / 60;
    }

    this.scrollToCenterX = function(x)
    {
        this.area.parentElement.scrollLeft =
            x - this.area.parentElement.clientWidth / 2;
    }

    this.mouseMove = function(event)
    {
        var x = event.layerX;
        var y = event.layerY;
        var previouslyHighlightedNoteLine = this.highlightedNoteLine;
        var previouslyHighlightedNote = this.highlightedNote;
        var notesMoved = false;
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
                var firstNoteTime = this.getFirstNote(this.selectedNotes).time;
                var deltaX = event.movementX *
                    ((note.time - firstNoteTime) /
                     (this.clickedNote.time - firstNoteTime));
                this.moveNote(note, deltaX);
            }
            notesMoved = true;
        }
        else if(this.selectedNotes.length > 0)
        {
            if(event.buttons == 1)
            {
                this.saveUndoStateBeforeNotesAreMoved();
                this.moveSelectedNotes(event.movementX);
                notesMoved = true;
            }
            else
            {
                this.highlightedNoteLine = this.closeToNoteLine(y);
            }
        }
        this.updateSelection(x, y);
        if(this.highlightedNote == null)
        {
            this.beatHoveredOver = this.getBeatContainingX(x);
        }
        else
        {
            this.highlightedNoteLine = null;
        }
        if(previouslyHighlightedNote != this.highlightedNote || notesMoved)
        {
            this.layers.note.draw();
        }
        if(previouslyHighlightedNoteLine != this.highlightedNoteLine)
        {
            this.layers.grid.draw();
        }
        this.layers.note.draw();
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

    this.getBeatContainingX = function(x)
    {
        var time = this.xToTime(x);
        var beat = Math.floor(time);
        return beat;
    }

    this.mouseDown = function(event)
    {
        var x = event.layerX;
        var y = event.layerY;
        if(mode == ADD_NOTE)
        {
            if(this.highlightedNoteLine == null)
            {
                exitMode();
            }
            else
            {
                var time = this.xToTime(x);
                var note = {time: time, type: this.highlightedNoteLine};
                this.addNotes([note]);
            }
        }
        else if(mode == REMOVE_NOTE)
        {
            if(this.highlightedNote == null)
            {
                exitMode();
            }
            else
            {
                this.removeNotes([this.highlightedNote]);
            }
        }
        else if(pastedNotes.length > 0)
        {
            this.addPastedNotes();
            pastedNotes = [];
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

    this.addNotes = function(notes)
    {
        saveUndoState();
        for(var note of notes)
        {
            this.score.notes.push(note);
        }
        var path = this.score.noteTypes[note.type];
        updateJson();
        this.layers.note.draw();
    }

    this.removeNotes = function(notes)
    {
        saveUndoState();
        for(var note of notes)
        {
            var index = this.score.notes.indexOf(note);
            this.score.notes.splice(index, 1);
        }
        updateJson();
        this.layers.note.draw();
    }

    this.addPastedNotes = function()
    {
        var startBeat = Math.floor(this.getFirstNote(pastedNotes));
        var notes = [];
        for(var note of pastedNotes)
        {
            var adjustedNote = this.adjustNote(note);
            notes.push(adjustedNote);
        }
        this.addNotes(notes);
    }

    this.getFirstNote = function(notes)
    {
        var firstNote = null;
        for(var note of notes)
        {
            if(firstNote == null || note.time < firstNote.time)
            {
                firstNote = note;
            }
        }
        return firstNote;
    }

    this.changeNoteTypeForSelectedNotes = function(noteType)
    {
        saveUndoState();
        for(var note of this.selectedNotes)
        {
            note.type = noteType;
        }
        updateJson();
        this.layers.note.draw();
    }

    this.saveUndoStateBeforeNotesAreMoved = function()
    {
        if(!this.notesMoved)
        {
            this.notesMoved = true;
            saveUndoState();
        }
    }

    this.moveSelectedNotes = function(deltaX)
    {
        for(var note of this.selectedNotes)
        {
            this.moveNote(note, deltaX);
        }
    }

    this.moveNote = function(note, deltaX)
    {
        note.time += this.calculateNoteTime(deltaX);
    }

    this.mouseUp = function(event)
    {
        this.selectNotesInRectangle();
        if(this.notesMoved)
        {
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
        this.layers.grid.draw();
        this.layers.note.draw();
    }

    this.addNoteType = function(noteType)
    {
        saveUndoState();
        this.score.noteTypes.push(noteType);
        this.layers.grid.draw();
        this.layers.note.draw();
    }

    this.setBeats = function(beats)
    {
        saveUndoState();
        this.score.beats = beats;
        this.updateWidth();
        updateJson();
    }
}

function ImportSheet(area)
{
    Sheet.call(this, area);
    this.area.sheet = this;
    this.area.addEventListener("mousemove",
                                 function(e){this.sheet.mouseMove(e)},
                                 false);
    this.area.addEventListener("mousedown",
                                 function(e){this.sheet.mouseDown(e)},
                                 false);
    this.area.addEventListener("mouseup",
                                 function(e){this.sheet.mouseUp(e)},
                                 false);

    this.mouseMove = function(event)
    {
        var x = event.layerX;
        var y = event.layerY;
        this.updateSelection(x, y);
    }

    this.mouseDown = function(event)
    {
        this.startSelection(event);
    }

    this.mouseUp = function(event)
    {
        if(this.selectionStartPoint != null)
        {
            this.selectNotesInRectangle();
        }
    }
}

function Layer(sheet, parent)
{
    this.canvas = document.createElement("canvas");
    parent.appendChild(this.canvas);
    this.canvas.classList.add("scoreCanvas");
    this.canvas.height = parent.clientHeight;
    this.context = this.canvas.getContext("2d");

    this.draw = function() {}

    this.clear = function()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.drawLine = function(startX, startY, endX, endY)
    {
        this.context.beginPath();
        this.context.moveTo(startX, startY);
        this.context.lineTo(endX, endY);
        this.context.stroke();
    }
}

function GridLayer(sheet, parent)
{
    Layer.call(this, sheet, parent);

    this.draw = function()
    {
        this.clear();
        this.drawNoteLines();
        this.drawBeatLines();
    }

    this.drawNoteLines = function()
    {
        for(var i = 0; i < sheet.numberOfNoteTypes(); i ++)
        {
            this.drawNoteLine(i);
        }
    }

    this.drawNoteLine = function(index)
    {
        var y = sheet.calculateNoteTypeY(index);
        if(sheet.highlightedNoteLine == index)
        {
            this.context.strokeStyle = HIGHLIGHT_COLOUR;
        }
        else
        {
            this.context.strokeStyle = MAIN_COLOUR;
        }
        this.drawLine(0, y, parent.clientWidth, y);
    }

    this.drawBeatLines = function()
    {
        this.context.strokeStyle = MAIN_COLOUR;
        for(var i = 1; i < sheet.score.beats; i ++)
        {
            this.drawBeatLine(i);
        }
    }

    this.drawBeatLine = function(index)
    {
        var x = (parent.clientWidth / (sheet.score.beats / index));
        this.drawLine(x, 0, x, parent.clientHeight);
    }
}

function NoteLayer(sheet, parent)
{
    Layer.call(this, sheet, parent);

    this.draw = function()
    {
        this.clear();
        this.drawNotes();
    }

    this.drawNotes = function()
    {
        for(var note of sheet.score.notes)
        {
            this.drawNote(note);
        }
        if(sheet.isMain && pastedNotes.length > 0)
        {
            for(var note of pastedNotes)
            {
                var adjustedNote = sheet.adjustNote(note);
                this.drawNote(adjustedNote, IMPORT_COLOUR);
            }
        }
    }

    this.drawNote = function(note, colour)
    {
        var x = sheet.calculateNoteX(note);
        var y = sheet.calculateNoteY(note);
        if(colour != null)
        {
            this.context.fillStyle = colour;
        }
        else if(sheet.selectedNotes.indexOf(note) != -1)
        {
            this.context.fillStyle = HIGHLIGHT_COLOUR;
        }
        else
        {
            this.context.fillStyle = MAIN_COLOUR;
        }
        this.fillCircle(x, y, NOTE_SIZE);
        if(sheet.highlightedNote == note)
        {
            this.context.strokeStyle = HIGHLIGHT_COLOUR;
            this.strokeCircle(x, y, NOTE_SIZE, 2);
        }
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
}

function SelectionLayer(sheet, parent)
{
    Layer.call(this, sheet, parent);

    this.draw = function()
    {
        this.clear();
        this.context.beginPath();
        this.context.lineWidth = 1;
        this.context.rect(
            sheet.selectionStartPoint.x,
            sheet.selectionStartPoint.y,
            sheet.selectionEndPoint.x - sheet.selectionStartPoint.x,
            sheet.selectionEndPoint.y - sheet.selectionStartPoint.y);
        this.context.stroke();
    }
}

function PlayRangeLayer(sheet, parent)
{
    Layer.call(this, sheet, parent);

    this.draw = function()
    {
        this.clear();
        this.context.beginPath();
        this.context.rect(
            0,
            0,
            sheet.timeToX(startBeat - 1),
            parent.clientHeight);
        this.context.rect(
            sheet.timeToX(endBeat),
            0,
            sheet.timeToX(sheet.score.beats),
            parent.clientHeight);
        this.context.fillStyle = "rgba(0, 0, 0, 0.15)";
        this.context.fill();
    }
}

function TimeMarkerLayer(sheet, parent)
{
    Layer.call(this, sheet, parent);

    this.draw = function()
    {
        this.clear();
        var secondsPlayed = (Date.now() - startTime) / 1000;
        var beatsPlayed = sheet.secondsToBeats(secondsPlayed);
        var x = ((beatsPlayed + startBeat - 1) / sheet.score.beats)
            * parent.clientWidth;
        this.context.lineWidth = 2;
        this.drawLine(x, 0, x, parent.clientHeight);
        sheet.scrollToCenterX(x);
    }
}
