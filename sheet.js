var MAIN_COLOUR = "rgb(0, 0, 0)"
var HIGHLIGHT_COLOUR = "rgb(255, 0, 0)"

function Sheet(canvas)
{
    var score;
    var context = canvas.getContext("2d");
    var highlightedNoteLine;
    var selectionStartPoint;
    var selectedNotes = [];
    var clickedNote;
    var highlightedNote;
    var notesMoved = false;
    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mouseup", mouseUp, false);

    this.draw = function()
    {
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawNoteLines();
        drawBeatLines();
        drawNotes();
        drawTimeMarker();
        drawSelectionRectangle();
    }

    function drawNoteLines()
    {
        for(var i = 0; i < numberOfNoteTypes(); i ++)
        {
            drawNoteLine(i);
        }
    }

    function numberOfNoteTypes()
    {
        return Object.keys(score.noteTypes).length
    }

    function drawNoteLine(index)
    {
        y = calculateNoteTypeY(index);
        if(highlightedNoteLine == index)
        {
            context.strokeStyle = HIGHLIGHT_COLOUR;
        }
        else
        {
            context.strokeStyle = MAIN_COLOUR;
        }
        drawLine(0, y, canvas.width, y, 1);
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
        context.strokeStyle = MAIN_COLOUR;
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

    function strokeCircle(x, y, r, width)
    {
        context.beginPath();
        context.arc(x, y, r, 0, 2 * Math.PI);
        context.lineWidth = width;
        context.stroke();
    }

    function fillCircle(x, y, r)
    {
        context.beginPath();
        context.arc(x, y, r, 0, 2 * Math.PI);
        context.fill();
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

    function mouseMove(event)
    {
        var x = xInCanvas(event.clientX);
        var y = yInCanvas(event.clientY);
        if(mode == ADD_NOTE)
        {
            highlightedNoteLine = closeToNoteLine(y);
        }
        else if(mode == REMOVE_NOTE)
        {
            highlightedNote = withinNote(x, y);
        }
        else if(mode == RESIZE && event.buttons == 1 &&
                selectedNotes.length > 0)
        {
            saveUndoStateBeforeNotesAreMoved();
            for(var note of selectedNotes)
            {
                var deltaX = event.movementX *
                    ((note.time - firstNote.time) /
                     (clickedNote.time - firstNote.time));
                moveNote(note, deltaX);
            }
        }
        else if(event.buttons == 1 && selectedNotes.length > 0)
        {
            saveUndoStateBeforeNotesAreMoved();
            moveSelectedNotes(event.movementX);
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

    function xInCanvas(rawX)
    {
        return rawX - canvas.offsetLeft;
    }

    function yInCanvas(rawY)
    {
        return rawY - canvas.offsetTop;
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

    function saveUndoStateBeforeNotesAreMoved()
    {
        if(!notesMoved)
        {
            notesMoved = true;
            saveUndoState();
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

    function moveSelectedNotes(deltaX)
    {
        for(var note of selectedNotes)
        {
            moveNote(note, deltaX);
        }
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
                var time = xToTime(x);
                addNote(time, highlightedNoteLine);
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
            clickedNote = withinNote(x, y);
            if(clickedNote != null)
            {
                if(selectedNotes.indexOf(clickedNote) == -1)
                {
                    if(!event.shiftKey)
                    {
                        selectedNotes = [];
                    }
                    selectNote(clickedNote);
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

    function xToTime(x)
    {
        var time = x  * score.beats / canvas.width;
        return time;
    }

    function addNote(time, type)
    {
        saveUndoState();
        var note = {time: time, type: type};
        score.notes.push(note);
        var path = score.noteTypes[type];
        addSound(path);
    }

    this.addNote = function(time, type)
    {
        addNote(time, type);
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

    function selectNote(note)
    {
        if(selectedNotes.indexOf(note) == -1)
        {
            selectedNotes.push(note);
        }
    }

    function mouseUp(event)
    {
        if(selectionStartPoint != null)
        {
            selectNotesInRectangle();
            selectionStartPoint = null;
            selectionEndPoint = null;
        }
        if(notesMoved)
        {
            updateScoreInSoundLoop();
            updateJson();
            notesMoved = false;
        }
        clickedNote = null;
    }

    function selectNotesInRectangle()
    {
        var firstNoteTime = null;
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
                selectNote(note);
                if(firstNoteTime == null || note.time < firstNoteTime)
                {
                    firstNote = note;
                    firstNoteTime = note.time;
                }
            }
        }
    }

    this.removeSelectedNotes = function()
    {
        removeNotes(selectedNotes);
        selectedNotes = [];
    }

    this.calculateDuration = function()
    {
        return score.beats / score.bpm * 60;
    }

    this.setScore = function(newScore)
    {
        score = newScore;
    }

    this.getScore = function()
    {
        return score;
    }
}
