var score;
var startTime;
var beatTime;
var numberOfIntroBeats = 4;
var clickList;
var intervalId;
var looping = false;

function frame(playIntro)
{
    beatTime = ((Date.now() - startTime) * score.bpm / 60) / 1000.0;
    if(playIntro)
    {
        if(beatTime >= clickList[0])
        {
            postMessageToMain("playClick");
            clickList.shift();
        }
        if(beatTime >= numberOfIntroBeats)
        {
            playScore();
        }
    }
    else
    {
        for(var i = 0; i < score.notes.length; i ++)
        {
            var note = score.notes[i];
            if(!note.played && beatTime >= note.time)
            {
                postMessageToMain("playNote", i);
                note.played = true;
            }
        }
        if(beatTime >= score.beats)
        {
            if(looping)
            {
                playScore();
            }
            else
            {
                clearInterval(intervalId);
                postMessageToMain("scoreDone");
            }
        }
    }
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
            note.played = beatTime >= note.time;
        }
    }
    else if(type == "play")
    {
        looping = content.looping;
        playScore();
    }
    else if(type == "playIntro")
    {
        clickList = [0.0, 1.0, 2.0, 3.0];
        startTime = Date.now();
        postMessageToMain("startTime", startTime);
        intervalId = setInterval(frame, 10, true);
    }
    else if(type == "stop")
    {
        looping = false;
        clearInterval(intervalId);
    }
    else
    {
        log.warn("Message of unkown type received:", message);
    }
}

function playScore()
{
    console.log("Starting loop.");
    for(note of score.notes)
    {
        note.played = false;
    }
    startTime = Date.now();
    postMessageToMain("startTime", startTime);
    clearInterval(intervalId);
    intervalId = setInterval(frame, 10);
}
