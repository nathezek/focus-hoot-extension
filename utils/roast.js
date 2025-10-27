
export function getRoast() {
    const roasts = [
        "Seriously? That video wasn’t in your syllabus, champ.",
        "Nice try — Focus Hoot saw that click. Back to studying!",
        "That’s not ‘research’. That’s procrastination with extra steps.",
        "🦉: I warned you, now we roast and refocus.",
        "You can’t outsmart an owl, buddy. Get back to it."
    ];
    return roasts[Math.floor(Math.random() * roasts.length)];
}

