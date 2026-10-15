const IMG_W = 794;
const IMG_H = 232;

const CARD_X = [15, 144, 273, 402, 531, 660];
const CARD_W = 122;

const roles = [
  { name: "Bomber #1", filled: true,  member: "DARUCKUS",  pass: 35, weight: "7.8%",  progress: "complete" },
  { name: "Robber #1", filled: true,  member: "SHINYAMED", pass: 25, weight: "7.1%",  progress: "complete" },
  { name: "Bomber #2", filled: true,  member: "NUGGETS",   pass: 69, weight: "18.0%", progress: "partial" },
  { name: "Driver",    filled: false, pass: 65, weight: "12.5%" },
  { name: "Robber #2", filled: false, pass: 73, weight: "22.9%" },
  { name: "Robber #3", filled: false, pass: 73, weight: "31.7%" }
];

const spots = [
  {
    x: 18, y: 6, w: 128, h: 88,
    title: "The Clock",
    text: "Time left until the crime completes (days:hours:minutes:seconds). Each role accounts for 24 hours. Here, 3 of 6 roles are filled-- two are done and the third is about 18.8 hours in. The timer will pause at 03:00:00:00 while the remaining three roles are empty. Once additional roles are filled, the timer will continue to count down. If filled roles complete and are waiting for people to join, the timer turns yellow and shows a pause symbol until more roles are filled.",
    footer: "A crime that never gets members will time out after 7 days, shown by a yellow block with its own countdown until the crime expires."
  },
  {
    x: 160, y: 6, w: 110, h: 26,
    title: "Crime Name",
    text: "The name of the organized crime. People may use it when asking for help.", 
    footer: "\"Join the Bomber #1 role in the Bidding War OC!\""
  },
  {
    x: 725, y: 8, w: 62, h: 32,
    title: "Level",
    text: "The crime difficulty level. If your pass rate is not high enough for any roles available, look for lower level crimes, or ask leadership to spawn some for you."
  },
  {
    x: 160, y: 38, w: 565, h: 54,
    title: "Description",
    text: "Flavor text about the crime. Fun to read, but it has no effect on how the crime works."
  }
];

roles.forEach((r, i) => {
  const cx = CARD_X[i];

  spots.push({
    x: cx + 26, y: 108, w: 70, h: 20,
    title: "Role",
    text: "The role's name. People may use it when asking for help.",
    footer: `\"Join the ${r.name} role in the Bidding War OC!\"`
  });

  let pieText;
  if (r.progress === "complete") pieText = "Full circle: this member has finished their part.";
  else if (r.progress === "partial") pieText = "Partly filled circle: this member is still working.\nHover for the exact percentage.";
  else pieText = "A question mark means the role is empty, so there is no progress yet.";
  spots.push({
    x: cx + 4, y: 110, w: 18, h: 18,
    title: "Progress",
    text: "A small pie chart of the role's progress.",
    footer: `${pieText}`
  });

  spots.push({
    x: cx + 98, y: 110, w: 24, h: 18,
    title: "Pass Rate",
    text: r.filled
      ? `${r.member}'s pass rate for this role. If the role is filled, the pass rate is shown for the current member.`
      : `Empty roles show YOUR pass rate. Higher is better. Try to be at 65 or above unless it is a low weighted role or you have been specifically instructed to join by leadership.`,
    footer: "Please note the role's weight to determine if pass rates lower than 65 are acceptable."
  });

  if (r.filled) {
    spots.push({
      x: cx + 4, y: 134, w: 114, h: 28,
      title: "Member",
      text: `${r.member} has joined the ${r.name} role.`
    });
  } else {
    spots.push({
      x: cx + 4, y: 134, w: 114, h: 28,
      title: "Open Slot",
      text: `The ${r.name} role is empty and waiting. Press Join if you qualify!`,
      footer: "Joining will progress the clock for the next 24 hours."
    });
  }

  const low = parseFloat(r.weight) < 10;
  spots.push({
    x: cx, y: 168, w: CARD_W, h: 52,
    title: "Weight",
    text: low
      ? `Under 10% makes this a Low Weight role-- it matters so little that pass rate is ignored and anyone can join (this may vary for different factions). That is why ${r.pass} is fine here.`
      : `This role carries ${r.weight} of the crime, so its pass rate matters. Join only if yours is high enough.`,
    footer: "This section is only visible with the weights userscript installed (linked below)."
  });
});

const hotspotsEl = document.getElementById("hotspots");
const stage = document.getElementById("stage");
const bubble = document.getElementById("bubble");
const bubbleTitle = document.getElementById("bubble-title");
const bubbleText = document.getElementById("bubble-text");
const bubbleFooter = document.getElementById("bubble-footer");

spots.forEach(s => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "hot";
  b.style.cssText =
    `left:${(s.x / IMG_W) * 100}%;top:${(s.y / IMG_H) * 100}%;` +
    `width:${(s.w / IMG_W) * 100}%;height:${(s.h / IMG_H) * 100}%`;
  b.setAttribute("aria-label", `${s.title}. ${s.text}${s.footer ? " " + s.footer.trim() : ""}`);

  b.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") show(b, s); });
  b.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hide(); });
  b.addEventListener("focus", () => show(b, s));
  b.addEventListener("blur", hide);
  b.addEventListener("click", e => { e.stopPropagation(); show(b, s); });

  hotspotsEl.appendChild(b);
});

document.addEventListener("click", hide);
document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });

function show(el, s) {
  bubbleTitle.textContent = s.title;
  bubbleText.textContent = s.text;
  bubbleFooter.textContent = s.footer ? s.footer.trim() : "";

  const st = stage.getBoundingClientRect();
  const hr = el.getBoundingClientRect();
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  const gap = 10;

  let left = hr.left - st.left + hr.width / 2 - bw / 2;
  left = Math.max(8, Math.min(left, st.width - bw - 8));

  const margin = 8;
  const fitsBelow = hr.bottom + gap + bh <= window.innerHeight - margin;
  const fitsAbove = hr.top - gap - bh >= margin;

  let below = hr.top - st.top + hr.height / 2 < st.height / 2;
  if (below && !fitsBelow && fitsAbove) below = false;
  else if (!below && !fitsAbove && fitsBelow) below = true;

  let viewTop = below ? hr.bottom + gap : hr.top - gap - bh;
  viewTop = Math.max(margin, Math.min(viewTop, window.innerHeight - bh - margin));
  const top = viewTop - st.top;

  bubble.style.left = left + "px";
  bubble.style.top = top + "px";
  bubble.classList.add("show");
}

function hide() {
  bubble.classList.remove("show");
}
