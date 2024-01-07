let input = "Immediate Night: Role Investigate @Selection (SD, WD)\nImmediate Night: Attribute Investigate @Selection for `Enchanted` (SD, WD)\nImmediate: Investigate `Huntress` Count (WD)\nImmediate: Target @Selection (Player) \nImmediate: Target @Selection (Player) [Quantity: 1]\nOn Killed: [Condition: @Target exists]\n  • Process: Attack @Target\n  • Evaluate: @Result is `Success`: Reveal `Huntress @Self killed @Target` to #story_time\nImmediate: End Night: Attack @Selection [Temporal: Night 2+, Quantity: 3]\nImmediate Day: Weakly Disguise @Self as @Selection (~Persistent) [Temporal: Day 0] {Forced: Citizen}\nImmediate: End Night: Attack @Selection [Temporal: Night 2+, Quantity: 3]\nImmediate Day: Weakly Disguise @Self as @Selection [Temporal: Day 0] {Forced: Citizen}\nImmediate Night: Protect @Self from `Attacks` through Absence at @Selection\nImmediate Night: Protect @Selection from `Attacks` (~Phase) [Quantity: 1] ⟨x3⟩\nAfterwards: Protect @Self from `Attacks` (~Phase)\nImmediate Night: Protect @Selection from `Attacks` (~Phase) [Succession: No Target Succession] ⟨x1, $living>15 ⇒ x2⟩\nStarting: Apply `CureAvailable` to @Self\nStarting: Apply `Poisoned` to @Selection (~Persistent) (Inactive)\nPassive Start Day: Change `Poisoned` value `1` to `Active` for @(Attr:Poisoned:@Self)\nImmediate Night: Remove `Poisoned` from @Selection\nPassive: Redirect `non-killing abilities` from @(Attr:Wolfish) to @Target [Quantity: 1, Condition: @Target exists]\nPassive: Redirect `all` to @Target [Condition: @Target exists]\nImmediate Night: Manipulate @Self's `public voting power` to `2` (~NextDay)\nStarting: Manipulate @Self's `public voting power` to `-1`\nStarting: Manipulate @Selection's `public voting power` by `-1` (~NextDay)\nStarting: Whisper to #Grandma's-House as `Grandma`";

window.onload = (event) => {
    document.getElementsByClassName("input")[0].innerHTML = "<pre>" + input + "</pre>";
    
    let inputLines = input.split("\n");
    let parsedRole = parseRole(inputLines);
    
    console.log(parsedRole);
    pretty = parsedRole.triggers.map(el => "<b>" + el[0] + ":</b>\n\t" + el[1].map(el2 => JSON.stringify(el2)).join("\n\t") + "\n").join("");
    document.getElementsByClassName("output")[0].innerHTML = "<pre>" + pretty + "</pre>"; 
};




let name = "";
let unique = false;
let triggers = [];

let actionTimings = ["Start Night","End Night","Start Day","End Day","Immediate Night","Immediate Day","End Phase","Start Phase","Immediate"];
let passiveTriggers = ["Passive", "Passive End Day", "Passive End Night", "Passive Start Day", "Passive Start Night", "Passive Start Phase", "Passive End Phase"];
let electionTriggers = ["On Election", "On Mayor Election", "On Reporter Election", "On Guardian Election"];
let defenseTriggers = ["On Defense", "On Passive Defense", "On Partial Defense", "On Recruitment Defense"];
let basicTriggerTypes = [...actionTimings, "Compound", "Starting", ...passiveTriggers, "On Death", "On Killed","On Visited", "On Action", "On Disbandment", "On Lynch", ...electionTriggers, ...defenseTriggers, "On Betrayal", "Afterwards", "On Poll Closed", "On Role Change", "On Removal", "On End"]; // basic trigger types
let adancedTriggerTypes = ["On <Target> Death","On Visited [<Ability Type>]", "On <Target> Visited","On <Target> Visited [<Ability Type>]","On Action [<Ability Type>]"]; // trigger types containing parameters
let bullets = ["•","‣","◦","·","⁃","⹀"];



function parseRole(inputLines) {
    console.log("PARSE TRIGGERS");
    let triggers = parseTriggers(inputLines);
    
    console.log("PARSE ABILITIES")
    for(let t in triggers.triggers) {
        let abilities = parseAbilities(triggers.triggers[t]);
        triggers.triggers[t] = abilities;
    }
    
    return triggers;
}

/** REGEX - Reminder: You need double \'s here **/
// general
const targetType = "(`[^`]*`|@\\S*)";
const attrDuration = "( \\(~[^\)]+\\))?";
const locationType = "(`[^`]*`|@\\S*|#\\S*)"; // extended version of target type
const attributeName = targetType;
const num = "(-?\\d+)";

// specific
const investAffected = " ([\\(\\),SDWD ]*)?";
const defenseAttackSubtypes = "(Attacks|Kills|Lynches|Attacks & Lynches|All)";
const defenseSubtypes = "(Absence at " + locationType + "|Active Defense|Passive Defense|Partial Defense|Recruitment Defense)";
const defensePhases = "(Day|Night)";
const attrValue = "([\\w\\d]+)";
const attrData = "\\(" + attrValue + "\\)";
const attrIndex = num;
const redirectSubtype = "(all|non-killing abilities)";
const manipSubtype = "(public voting power|special public voting power|private voting power|public starting votes|lynch starting votes|election starting votes)";

function parseAbilities(trigger) {
    for(let a in trigger[1]) {
    let abilityLineSplit = trigger[1][a].split(/ \[| \{| ⟨/);
        let ability = null;
        let exp, fd;
        
        let abilityLine = abilityLineSplit.shift();
        let abilityValues = trigger[1][a].split(abilityLine)[1];
        console.log("VALUES: ", abilityValues);
        
        /** KILLING **/
        exp = new RegExp("(Kill|Attack|Lynch|True Kill) " + targetType, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "killing", subtype: lc(fd[1]), target: fd[2] };
        }
        /** INVESTIGATION **/
        // Role/align/cat/class Invest
        exp = new RegExp("(Role|Alignment|Category|Class) Investigate " + targetType + investAffected, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "investigating", subtype: lc(fd[1]), target: fd[2], ...parseInvestAffected(fd[3]) };
        }
        // Attribute invest
        exp = new RegExp("Attribute Investigate " + targetType + " for " + targetType + investAffected, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "investigating", subtype: "attribute", target: fd[1], attribute: fd[2], ...parseInvestAffected(fd[3]) };
        }
        // Role Count invest
        exp = new RegExp("Investigate " + targetType + " Count" + investAffected, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "investigating", subtype: "count", target: fd[1], ...parseInvestAffected(fd[2]) };
        }
        /** TARGET **/
        // target
        exp = new RegExp("Target " + targetType, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "targeting", subtype: "target", target: fd[1] };
        }
        // untarget
        exp = new RegExp("Untarget", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "targeting", subtype: "untarget", target: fd[1] };
        }
        /** DISGUISING **/
        exp = new RegExp("(Weakly|Strongly) Disguise " + targetType + " as " + targetType + attrDuration, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "disguising", subtype: lc(fd[1]), target: fd[2], disguise: fd[3], duration: dd(fd[4], "permanent") };
        }
        /** PROTECTING **/
        // From By Through During
        exp = new RegExp("Protect " + targetType + " from `" + defenseAttackSubtypes + "` by " + targetType + " through " + defenseSubtypes + " during " + defensePhases + attrDuration, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "protecting", subtype: lc(fd[4]), target: fd[1], defense_from_type: rblc(fd[2]), defense_from_target: fd[3], defense_during: fd[fd.length-2], duration: dd(fd[fd.length-1], "permanent") };
            if(ability.subtype.substr(0,7)  == "absence") {
                ability.subtype = "absence";
                ability.absence_at = fd[5];
            }
        }
        // From By Through
        exp = new RegExp("Protect " + targetType + " from `" + defenseAttackSubtypes + "` by " + targetType + " through " + defenseSubtypes + attrDuration, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "protecting", subtype: lc(fd[4]), target: fd[1], defense_from_type: rblc(fd[2]), defense_from_target: fd[3], defense_during: "all", duration: dd(fd[fd.length-1], "permanent") };
            if(ability.subtype.substr(0,7)  == "absence") {
                ability.subtype = "absence";
                ability.absence_at = fd[5];
            }
        }
        // From Through During
        exp = new RegExp("Protect " + targetType + " from `" + defenseAttackSubtypes + "` through " + defenseSubtypes + " during " + defensePhases + attrDuration, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "protecting", subtype: lc(fd[3]), target: fd[1], defense_from_type: rblc(fd[2]), defense_from_target: "@All", defense_during: fd[fd.length-2], duration: dd(fd[fd.length-1], "permanent") };
            if(ability.subtype.substr(0,7)  == "absence") {
                ability.subtype = "absence";
                ability.absence_at = fd[4];
            }
        }
        // From Through
        exp = new RegExp("Protect " + targetType + " from `" + defenseAttackSubtypes + "` through " + defenseSubtypes + attrDuration, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "protecting", subtype: lc(fd[3]), target: fd[1], defense_from_type: rblc(fd[2]), defense_from_target: "@All", defense_during: "all", duration: dd(fd[fd.length-1], "permanent") };
            if(ability.subtype.substr(0,7)  == "absence") {
                ability.subtype = "absence";
                ability.absence_at = fd[4];
            }
        }
        /** APPLYING **/
        // standard applying - add attribute
        exp = new RegExp("Apply " + attributeName + " to " + targetType + attrDuration, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "applying", subtype: "add", target: fd[2], attribute: fd[1], duration: dd(fd[3], "permanent") };
        }
        // standard applying with parameter
        exp = new RegExp("Apply " + attributeName + " to " + targetType + attrDuration + " " + attrData, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "applying", subtype: "add", target: fd[2], attribute: fd[1], duration: dd(fd[3], "permanent"), attr_index: 1, attr_value: fd[fd.length-1] };
        }
        // Remove Attribute
        exp = new RegExp("Remove " + attributeName + " from " + targetType, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "applying", subtype: "remove", target: fd[2], attribute: fd[1] };
        }
        // Change Attribute Value
        exp = new RegExp("Change " + attributeName + " value `" + attrIndex + "` to `" + attrValue + "` for " + targetType, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "applying", subtype: "change", target: fd[4], attribute: fd[1], attr_index: +fd[2], attr_value: fd[3]  };
        }
        /** REDIRECTING **/
        // redirect from all
        exp = new RegExp("Redirect `" + redirectSubtype + "` to " + targetType, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "redirecting", subtype: fd[1], target: fd[2], source: "@All" };
        }
        // redirect from certain players
        exp = new RegExp("Redirect `" + redirectSubtype + "` from " + targetType + " to " + targetType, "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "redirecting", subtype: fd[1], target: fd[3], source: fd[2] };
        }
        /** VOTE MANIPULATION **/
        // manipulation by absolute value
        exp = new RegExp("Manipulate " + targetType + "'s `" + manipSubtype + "` to `" + num + "`" + attrDuration , "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "manipulating", subtype: "absolute", target: fd[1], manip_type: fd[2], manip_value: fd[3], duration: dd(fd[4], "permanent") };
        }
        // manipulation by relative value
        exp = new RegExp("Manipulate " + targetType + "'s `" + manipSubtype + "` by `" + num + "`" + attrDuration , "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "manipulating", subtype: "relative", target: fd[1], manip_type: fd[2], manip_value: fd[3], duration: dd(fd[4], "permanent") };
        }
        /** WHISPERING **/
        // manipulation by absolute value
        exp = new RegExp("Whisper to " + locationType + " as " + targetType + attrDuration , "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "whispering", target: fd[1], disguise: fd[2], duration: dd(fd[3], "permanent") };
        }
        
        
        /** Ability Types End */
        if(ability) {
            console.log("IDENT", ability);
            trigger[1][a] = ability;
        } else {
            console.log("UNIDENT", abilityLine);
        }
    }
    return trigger;
}

// parse the WD/SD affected element for invest abilities
function parseInvestAffected(param) {
    return { affected_by_wd: param.includes("WD"), affected_by_sd: param.includes("SD") };
}

// default duration: returns the default (def) if the duration (dur) is not set
function dd(dur, def) {
    return dur ? dur.toLowerCase().replace(/[^a-z]*/g,"") : def;
}

// remove backticks
function rb(input) {
    return input.replace(/`/g, "");
}

// to lower case
function lc(input) {
    return input.toLowerCase();
}

// remove backticks + to lower case
function rblc(input) {
    return rb(lc(input));
}

function parseTriggers(inputLines) {

    let curTriggerType = null;
    let curTrigger = [];
    let unique = false;

    while(inputLines.length > 0) {
        let curInputLine = inputLines.shift().trim();
        
        // continue previous trigger
        if(bullets.includes(curInputLine[0])) {
            console.log("CONT: ", curInputLine);
            curTrigger.push(curInputLine)
        }
        // start new trigger
        else {
            console.log("NEW: ", curInputLine);
            // store previous trigger if existing
            if(curTriggerType) {
                triggers.push([curTriggerType, curTrigger]);
            }
            curTriggerType = null;
            curTrigger = [];
            
            if(curInputLine === "No Abilities") { // No Abilities
                // nothing - no abilities
                continue;
            } else if(curInputLine === "Unique Role") { // Unique Role
                // set unique value to true
                unique = true;
                continue;
            }
            
            let curInputLineSplit = curInputLine.split(": ");
            let curTriggerName = curInputLineSplit.shift().split(":")[0];
            
            // basic trigger type
            if(basicTriggerTypes.includes(curTriggerName)) {
                curTriggerType = curTriggerName;
                curTrigger.push(curInputLineSplit.join(": "));
            } else {
                console.log("UNIDENT");
            }
            
            // TODO advanced trigger type
        }  
    }


    // store final trigger
    if(curTriggerType) {
        triggers.push([curTriggerType, curTrigger]);
    }

    return { triggers: triggers, unique: unique };

}