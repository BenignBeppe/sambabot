var score;
var startTime;
var time;
var running;
var numberOfIntroBeats = 4;
var clickList;

function loop(playIntro)
{
    time = ((Date.now() - startTime) * score.bpm / 60) / 1000.0;
    if(playIntro)
    {
        if(time >= clickList[0])
        {
            postMessageToMain("playClick");
            clickList.shift();
        }
        if(time >= ((60 / score.bpm) * numberOfIntroBeats))
        {
            playScore();
        }
        else
        {
            setTimeout(loop, 10, true);
        }
    }
    else
    {
        for(var i = 0; i < score.notes.length; i ++)
        {
            var note = score.notes[i];
            if(!note.played && time >= note.time)
            {
                postMessageToMain("playNote", i);
                note.played = true;
            }
        }
        if(time >= score.beats)
        {
            running = false;
            postMessageToMain("scoreDone");
        }
        else
        {
            setTimeout(loop, 10, playIntro);
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
            note.played = time >= note.time;
        }
    }
    else if(type == "play")
    {
        playScore();
    }
    else if(type == "playIntro")
    {
        generateClickList();
        startTime = Date.now();
        postMessageToMain("startTime", startTime);
        loop(true);
    }
    else
    {
        log.warn("Message of unkown type received:", message);
    }
}

function generateClickList()
{
    clickList = [];
    for(var i = 0; i < numberOfIntroBeats; i ++)
    {
        var clickTime = ((60 / score.bpm) * i);
        clickList.push(clickTime);
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
    loop();
}
