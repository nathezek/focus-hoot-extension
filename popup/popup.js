
console.log("Popup loaded");
import { sendMessage } from "../utils/messaging.js";

document.getElementById("startBtn").addEventListener("click", async () => {
    const goal = document.getElementById("goal").value.trim();
    const timer = Number(document.getElementById("timer").value) || 25;

    if (!goal) return alert("Please enter your focus goal!");

    await sendMessage("START_SESSION", { goal, timer });
    alert(`Session started for "${goal}" (${timer} mins).`);
    window.close();
});
