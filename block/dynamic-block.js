
import { getData } from "../utils/storage.js";
import { getRoast } from "../utils/roast.js";

document.addEventListener("DOMContentLoaded", async () => {
    const roastEl = document.getElementById("roast");
    const reasonEl = document.getElementById("reason");
    const goalEl = document.getElementById("goal");
    const videoEl = document.getElementById("videoTitle");

    const lastBlock = await getData("lastBlock");
    if (!lastBlock) {
        roastEl.innerText = "Focus Hoot can't find any data... but you should be studying anyway!";
        return;
    }

    roastEl.innerText = getRoast();
    reasonEl.innerText = `🧠 Reason: ${lastBlock.reason}`;
    goalEl.innerText = `🎯 Your Goal: ${lastBlock.goal}`;
    videoEl.innerText = `📺 Blocked Video: ${lastBlock.title}`;
});

