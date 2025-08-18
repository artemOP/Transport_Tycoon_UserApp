function sendCommand(command) {
  window.parent.postMessage(command, "*");
}

sendCommand({
    type: "registerTrigger",
    trigger: "kick_filtered_members",
    name: "Kick Filtered Members"
});

async function loadFilteredMembers() {
  const response = await fetch("filtered_tsa.json");
  if (!response.ok) throw new Error("Could not load filtered_tsa.json");
  return await response.json();
}

let members_promise = loadFilteredMembers();
let members = [];
members_promise.then(data => {
    members = data;
    console.log("[KickMembers] Loaded filtered members:", members);
}).catch(err => {
    console.error("[KickMembers] Error loading filtered members:", err);
});
console.log(members)



let memberIdx = 0;
let username = "";
let id = "";
window.addEventListener("message", async (event) => {
    const evt = event.data;
    if (!evt || !evt.data) return;

    if (evt?.data?.foo) {
          console.log("[KickMembers] Ignoring getData trigger");
          return;
        }
    if (evt?.data?.trigger_kick_filtered_members) {
        sendCommand({ type: "sendCommand", command: "faction" });
        return;
    }
    if (evt?.data?.menu && evt.data.menu.startsWith("Faction Menu")) {
        sendCommand({ type: "forceMenuChoice", choice: "<span sort='b'/>Management", mod: 0 });
        return;
    }
    if (evt?.data?.menu && evt.data.menu.startsWith("Faction Management Menu")) {
        sendCommand({ type: "forceMenuChoice", choice: "Manage Members", mod:0 });
        return;
    }
    if (evt?.data?.menu && evt.data.menu.startsWith("Manage Members")) {
        sendCommand({ type: "forceMenuChoice", choice: "Member List", mod: 0 });
        return;
    }
    if (evt?.data?.menu && evt.data.menu.startsWith("Member List")) {
        console.log(evt.data)
        let member = members[memberIdx];
        if (!member) {
            console.log("[KickMembers] No more members to kick.");
            return;
        }
        id = member["User ID"];
        
        const MenuChoices = JSON.parse(evt.data.menu_choices);
        const idx = MenuChoices.findIndex(choice => choice[0].includes(id));
        if (idx === -1) {
            console.log(`[KickMembers] Member with ID ${id} not found in menu choices.`);
            memberIdx++;
            return;
        }
        const label = MenuChoices[idx][0];
        
        sendCommand({ type: "forceMenuChoice", choice: label, mod: 0 });
        return;
    }
    if (evt?.data?.menu && evt.data.menu.startsWith(`Member ${id}`)) {
        console.log(`[KickMembers] Kicking member: ${username} [${id}]`);
        sendCommand({ type: "forceMenuChoice", choice: "Remove Member", mod: 0 });
        sendCommand({ type: "forceMenuBack"});
        memberIdx++;
        return;
    }
    if (evt?.data?.menu_open === false) {
        // sendCommand({ type: "forceRequestResult", result: true });
    }
    // console.log(evt.data);
});