var score;
var startTime;
var time;

function loop()
{
    time = ((Date.now() - startTime) * score.bpm / 60) / 1000.0;
    for(var i = 0; i < score.notes.length; i ++)
    {
        var note = score.notes[i];
        if(!note.played && time >= note.time)
        {
            postMessageToMain("playNote", i);
            note.played = true;
        }
    }
    setTimeout(loop, 10);
}

function postMessageToMain(type, content)
{
    var message = {type: type, content: content};
    postMessage(message);
}

onmessage = function(message)
{
    var type = message.data.type;
    var content = message.data.content;
    if(type == "score")
    {
        score = content;
        for(note of score.notes)
        {
            note.played = time >= note.time;
        }
    }
    else if(type == "play")
    {
        console.log("Starting loop.");
        for(note of score.notes)
        {
            note.played = false;
        }
        startTime = Date.now();
        console.log("score =", score);
        loop();
    }
    else
    {
        log.warn("Message of unkown type received:", message);
    }
}
