//let firstInput = "Unique Role\nStarting:\n  • Whisper to #Grandma's-House as `Grandma`\n  • Manipulate @Self's `public voting power` to `0`\nImmediate Night:\n  • Manipulate @Self's `public voting power` to `2` (~NextDay)\n  • Add @Selection to #Grandma's-House (~NextDay)\n  • Add @SecondarySelection to #Grandma's-House (~NextDay)\n  • Evaluate:\n    ‣ @Selection->PublicVotingPower > `0`: Manipulate @Selection's `public voting power` by `-1` (~NextDay)\n    ‣ Otherwise: Learn `@Selection could not be manipulated`\n  • Evaluate:\n    ‣ @SecondarySelection->PublicVotingPower > `0`: Manipulate @SecondarySelection's `public voting power` by `-1` (~NextDay)\n    ‣ Otherwise:  Learn `@SecondarySelection could not be manipulated`\nStarting: Whisper to #Enchanted as `Flute Player`\nImmediate Night: Apply `Enchanted` to @Selection ⟨calc(round($total/10))⟩ [Condition: count(@(OrigRole:Flute Player)) is `1`]\nImmediate Night: Apply `Enchanted` to @Selection ⟨calc(round($total/20))⟩ [Condition: count(@(OrigRole:Flute Player)) is `>1`]";

window.onload = (event) => {
    //roleTest(firstInput);
};

function roleTest(input) {
    //document.getElementsByClassName("input")[0].innerHTML = "<pre>" + input + "</pre>";
    
    let abilityNames = abilitySubtype.substr(2, abilitySubtype.length - 3).split("|(").map(el => {
        let split = el.split(") ");
        let fullNames = [];
        let subtypes = split[0].split("|");
        fullNames.push("<b>" + split[1] + "</b>");
        if(subtypes.length > 1) subtypes.forEach(el2 => fullNames.push(el2 + " " +split[1]));
        return fullNames;
    }).flat().join("<br>");
    
    document.getElementsByClassName("abilities")[0].innerHTML = "<pre>" + abilityNames + "</pre>";
    
    let inputLines = input.split("\n");
    let parsedRole = parseRole(inputLines);
    
    console.log(JSON.stringify(parsedRole));
    pretty = parsedRole.triggers.map(el => "<b>" + el.trigger + ":</b>\n\t" + (el.parameters?"<i>"+JSON.stringify(el.parameters)+"</i>\n\t":"") + el.abilities.map(el2 => { if(el2.sub_abilities) { let sa = el2.sub_abilities; delete el2.sub_abilities; return JSON.stringify(el2) + "\n\t\t" + sa.map(el3 => (el3.condition?"<i>"+ el3.condition + "</i>\n\t\t":"") + JSON.stringify(el3.ability)).join("\n\t\t") } else { return JSON.stringify(el2); } }).join("\n\t") + "\n").join("");
    document.getElementsByClassName("output")[0].innerHTML = pretty.replace(/\n/g,"<br>").replace(/\t/g,"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"); 
}

let actionTimings = ["Start Night","End Night","Start Day","End Day","Immediate Night","Immediate Day","End Phase","Start Phase","Immediate"];
let passiveTriggers = ["Passive", "Passive End Day", "Passive End Night", "Passive Start Day", "Passive Start Night", "Passive Start Phase", "Passive End Phase"];
let electionTriggers = ["On Election", "On Mayor Election", "On Reporter Election", "On Guardian Election"];
let defenseTriggers = ["On Defense", "On Passive Defense", "On Partial Defense", "On Recruitment Defense"];
let basicTriggerTypes = [...actionTimings, "Compound", "Starting", ...passiveTriggers, "On Death", "On Killed","On Visited", "On Action", "On Disbandment", "On Lynch", ...electionTriggers, ...defenseTriggers, "On Betrayal", "Afterwards", "On Poll Closed", "On Role Change", "On Removal", "On End"]; // basic trigger types
let adancedTriggerTypes = ["On <Target> Death","On Visited [<Ability Type>]", "On <Target> Visited","On <Target> Visited [<Ability Type>]","On Action [<Ability Type>]"]; // trigger types containing parameters
let bullets = ["•","‣","◦","·","⁃","⹀"];

function delParam(tr) {
    return tr.map(el => el.ability);
}

function parseRole(inputLines) {
    console.log("PARSE TRIGGERS");
    let triggers = parseTriggers(inputLines);
    console.log(JSON.stringify(triggers));
    
    // get a default param for comparision
    const defaultParams = parseAbilities(["Immediate",["Disband"]])[1][0].parameters;
    
    console.log("PARSE ABILITIES");
    for(let t in triggers.triggers) {
        let abilities = parseAbilities(triggers.triggers[t]); // parse abilities of a trigger
        //console.log(JSON.stringify(abilities));
        /** Preprocessing **/
        /* Reformat P/E */
        let inPE = false;
        let peDepth = -1;
        let peIndex = null;
        let peType = null;
        for(const a in abilities[1]) {
            if(abilities[1][a].ability.type == "process" || abilities[1][a].ability.type == "evaluate") {
                inPE = true;
                peDepth = abilities[1][a].depth;
                peIndex = a;
                abilities[1][a].ability.sub_abilities = [];
                peType = abilities[1][a].ability.type;
                continue;
            }
            if(!inPE && abilities[1][a].condition) {
                inPE = true;
                peDepth = abilities[1][a].depth - 1;
                peIndex = a;
                let dc = deepCopy(abilities[1][a]);
                abilities[1][a].ability = { type: "evaluate", sub_abilities: [ {ability: dc.ability, condition: dc.condition} ] };
                continue;
            }
            if(inPE) {
                if(abilities[1][a].depth > peDepth) {
                    let dc = deepCopy(abilities[1][a]);
                    if(peType == "evaluate") {
                        if(dc.ability.type != "error") abilities[1][peIndex].ability.sub_abilities.push({ability: dc.ability, condition: dc.condition});
                        else abilities[1][peIndex].ability.sub_abilities.push({ability: dc.ability, condition: JSON.stringify(dc)});
                    } else if(peType == "process") {
                        abilities[1][peIndex].ability.sub_abilities.push({ability: dc.ability });
                    }
                    abilities[1][a].ability.type = "blank";
                } else {
                    inPE = false;
                }
            }
        }
        /* Remove Blank */
        abilities[1] = abilities[1].filter(el => el.ability.type != "blank"); // remove blank lines
        
        /** Formatting */
        /* Output */
        let paramAbilities = abilities[1].filter(el => el.ability.type != "error" && !deepEqual(el.parameters, defaultParams)); // check which abilities have params attached
        // no params
        if(paramAbilities.length == 0) {
            triggers.triggers[t] = { trigger: abilities[0], abilities: delParam(abilities[1]) };
        }
        // params attached to first line
        else if(paramAbilities.length == 1 && !deepEqual(abilities[1][0], defaultParams)) {
            triggers.triggers[t] = { trigger: abilities[0], abilities: delParam(abilities[1]), parameters: abilities[1][0].parameters };
        } else {
            triggers.triggers[t] = { trigger: "error_invalid_parameters", abilities: [], error_data: { trigger: abilities[0], abilities: abilities[1] } };
        }
    }
    
    return triggers;
}

/** REGEX - Reminder: You need double \'s here **/
// general
const targetType = "(`[^`]*`|@\\S*)";
const attrDuration = "( \\(~[^\)]+\\))?";
const locationType = "(`[^`]*`|@\\S*|#\\S*)"; // extended version of target type
const groupType = "(@\\S*|#\\S*)"; // reduced version of location type
const attributeName = targetType;
const num = "(-?\\d+)";
const rawStr = "[\\w\\s\\d@]+";
const str = "(" + rawStr + ")";
const decNum = "(-?\\d+\\.\\d+)";
const abilityType = "(Killing|Investigating|Targeting|Disguising|Protecting|Applying|Redirecting|Vote Manipulating|Whispering|Joining|Granting|Loyalty|Obstructing|Poll Manipulating|Announcements|Changing|Copying|Choices|Ascend|Descend|Disband|Counting|Conversation Reset|Cancel|Switching)";
const abilitySubtype = "((Kill|Attack|Lynch|True) Killing|(Role|Alignment|Category|Class|Count|Attribute) Investigating|(Target|Untarget) Targeting|() Disguising|(Absence|Active|Passive|Partial|Recruitment) Protecting|(Add|Remove|Change) Applying|() Redirecting|(Absolute|Relative) Vote Manipulating|() Whispering|(Add|Remove) Joining|(Add|Remove|Transfer) Granting|() Loyalty|() Obstructing|(Addition|Creation|Cancelling|Deletion|Manipulation) Poll Manipulating|() Announcements|(Role|Alignment|Group) Changing|(Ability|Full) Copying|(Creating|Choosing) Choices|() Ascend|() Descend|() Disband|(Increment|Decrement|Set) Counting|() Conversation Reset|() Cancel|() Switching)";
const bulletsRegex = /(•|‣|◦|·|⁃|⹀)/;

// specific
const investAffected = "( [\\(\\),SDWD ]*)?";
const defenseAttackSubtypes = "(Attacks|Kills|Lynches|Attacks & Lynches|All)";
const defenseSubtypes = "(Absence at " + locationType + "|Active Defense|Passive Defense|Partial Defense|Recruitment Defense)";
const defensePhases = "(Day|Night)";
const attrValue = "([\\w\\d]+)";
const attrData = "\\(" + attrValue + "\\)";
const attrIndex = num;
const redirectSubtype = "(all|non-killing abilities)";
const manipSubtype = "(public voting power|special public voting power|private voting power|public starting votes|lynch starting votes|election starting votes)";
const joiningSubtype = "(Member|Owner|Visitor)";
const loyaltySubtype = "(Group|Alignment)";
const pollManipManipSubtype = "(Unvotable|Disqualified)";

function parseAbilities(trigger) {
    for(let a in trigger[1]) {
        /**
        Split Line
        **/
        let abilityLineSplit = trigger[1][a].split(/ \[| \{| ⟨/);
        if(abilityLineSplit.length == 1) abilityLineSplit = trigger[1][a].split(/\[|\{|⟨/);
        let ability = null;
        let exp, fd;
        
        let abilityLine = abilityLineSplit.shift().replace(bulletsRegex,"").trim();
        let abilityValues = abilityLine.length > 0 ? trigger[1][a].split(abilityLine)[1] : trigger[1][a];
        
        // check for P/E Condition
        let abilityLineSplitPE = abilityLine.split(": ");
        let peCond;
        if(abilityLineSplitPE.length == 2) {
            abilityLine = abilityLineSplitPE[1].trim();
            peCond = abilityLineSplitPE[0].trim();
        }
        //console.log("VALUES: ", abilityValues);
        
        /**
        Evaluate additional values
        **/
        let restrictions = abilityValues.match(/(?<=\[).+(?=\])/)?.[0]?.split(", ");
        let compulsion = abilityValues.match(/(?<=\{).+(?=\})/)?.[0]?.split(", ");
        let scaling = abilityValues.match(/(?<=\⟨).+(?=\⟩)/)?.[0]?.split(", ");
        let parsedRestrictions = [];
        let parsedScaling = [];
        
        for(let rest in restrictions) {
            /** Temporal **/
            // temporal, during
            exp = new RegExp("^Temporal: (Day|Night) (\\d+)$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "temporal", subtype: "during", phase: phaseParse(fd[1], fd[2]) });
            }
            // temporal, after
            exp = new RegExp("^Temporal: (Day|Night) (\\d+)\\+$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "temporal", subtype: "after", phase: phaseParse(fd[1], fd[2]) });
            }
            /** Attribute **/
            // self has attribute
            exp = new RegExp("^Attribute: has " + targetType + "$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "attribute", subtype: "has", target: "@Self", attribute: fd[1] });
            }
            // self lacks attribute
            exp = new RegExp("^Attribute: lacks " + targetType + "$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "attribute", subtype: "lacks", target: "@Self", attribute: fd[1] });
            }
            // self has attribute
            exp = new RegExp("^Attribute: " + targetType + " has " + targetType + "$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "attribute", subtype: "has", target: fd[1], attribute: fd[2] });
            }
            // self lacks attribute
            exp = new RegExp("^Attribute: " + targetType + " lacks " + targetType + "$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "attribute", subtype: "lacks", target: fd[1], attribute: fd[2] });
            }
            /** Succession **/
            // no succession
            exp = new RegExp("^Succession: No Succession$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "succession", subtype: "default" });
            }
            // no target succession
            exp = new RegExp("^Succession: No Target Succession$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "succession", subtype: "target" });
            }
            /** Quantity **/
            // quantity
            exp = new RegExp("^Quantity: (\\d+)$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "quantity", quantity: +fd[1] });
            }
            /** Condition **/
            // condition
            exp = new RegExp("^Condition: (.+)$", "g");
            fd = exp.exec(restrictions[rest]);
            if(fd) {
                parsedRestrictions.push({ type: "condition", condition: fd[1] });
            }
        }
        
        for(let scal in scaling) {
            let scalFound = false;
            /** Multiplier **/
            // always
            exp = new RegExp("^x(\\d+)$", "g");
            fd = exp.exec(scaling[scal]);
            if(fd) {
                parsedScaling.push({ type: "multiplier", quantity: +fd[1], odd: true, even: true });
                scalFound = true;
            }
            // odd phase 
            exp = new RegExp("^Odd: x(\\d+)$", "g");
            fd = exp.exec(scaling[scal]);
            if(fd) {
                parsedScaling.push({ type: "multiplier", quantity: +fd[1], odd: true, even: false });
                scalFound = true;
            }
            // even phase 
            exp = new RegExp("^Even: x(\\d+)$", "g");
            fd = exp.exec(scaling[scal]);
            if(fd) {
                parsedScaling.push({ type: "multiplier", quantity: +fd[1], odd: false, even: true });
                scalFound = true;
            }
            /** Split Scaling **/
            // always
            exp = new RegExp("^\\*(\\d+)$", "g");
            fd = exp.exec(scaling[scal]);
            if(fd) {
                parsedScaling.push({ type: "split", quantity: +fd[1] });
                scalFound = true;
            }
            /** Dynamic Scaling **/
            exp = new RegExp("^(\\$total|\\$living)/(\\d+)$", "g");
            fd = exp.exec(scaling[scal]);
            if(fd) {
                parsedScaling.push({ type: "math_multiplier", quantity: "calc(" + fd[1] + "/" + fd[2] + ")" });
                scalFound = true;
            }
            exp = new RegExp("^(\\$total|\\$living)(\\<|\\>|≤|≥|\\=)(\\d+) ⇒ (\\d+)$", "g");
            fd = exp.exec(scaling[scal]);
            if(fd) {
                parsedScaling.push({ type: "dynamic", compare: fd[1], compare_type: fd[2], compare_to: +fd[3], quantity: +fd[4] });
                scalFound = true;
            }
            /** Math Multiplier **/
            exp = new RegExp("^(.+)$", "g");
            fd = exp.exec(scaling[scal]);
            if(fd && !scalFound) {
                parsedScaling.push({ type: "math_multiplier", quantity: fd[1] });
                scalFound = true;
            }
        }
        
        let cDirect = false;
        let cRepeating = false;
        let cVisitless = false;
        let cForced = false;
        let cForcedSelection = null;
        for(let comp in compulsion) {
            if(compulsion[comp] == "Direct") cDirect = true;
            else if(compulsion[comp] == "Repeating") cRepeating = true;
            else if(compulsion[comp] == "Visitless") cVisitless = true;
            else if(compulsion[comp] == "Forced") cForced = true;
            else if(compulsion[comp].substr(0, 6) == "Forced") {
                cForced = true;
                cForcedSelection = compulsion[comp].substr(7);
            }
        }
        
        /**
        Evaluate Ability Types
        **/
        
        /** KILLING **/
        exp = new RegExp("^(Kill|Attack|Lynch|True Kill) " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "killing", subtype: lc(fd[1]), target: fd[2] };
        }
        /** INVESTIGATION **/
        // Role/align/cat/class Invest
        exp = new RegExp("^(Role|Alignment|Category|Class) Investigate " + targetType + investAffected + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "investigating", subtype: lc(fd[1]), target: fd[2], ...parseInvestAffected(fd[3]) };
        }
        // Attribute invest
        exp = new RegExp("^Attribute Investigate " + targetType + " for " + targetType + investAffected + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "investigating", subtype: "attribute", target: fd[1], attribute: fd[2], ...parseInvestAffected(fd[3]) };
        }
        // Role Count invest
        exp = new RegExp("^Investigate " + targetType + " Count" + investAffected + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "investigating", subtype: "count", target: fd[1], ...parseInvestAffected(fd[2]) };
        }
        /** TARGET **/
        // target
        exp = new RegExp("^Target " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "targeting", subtype: "target", target: fd[1] };
        }
        // untarget
        exp = new RegExp("^Untarget$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "targeting", subtype: "untarget", target: fd[1] };
        }
        /** DISGUISING **/
        exp = new RegExp("^(Weakly|Strongly) Disguise " + targetType + " as " + targetType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "disguising", subtype: lc(fd[1]), target: fd[2], disguise: fd[3], duration: dd(fd[4], "permanent") };
        }
        /** PROTECTING **/
        // From By Through During
        exp = new RegExp("^Protect " + targetType + " from `" + defenseAttackSubtypes + "` by " + targetType + " through " + defenseSubtypes + " during " + defensePhases + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "protecting", subtype: lc(fd[4]), target: fd[1], defense_from_type: rblc(fd[2]), defense_from_target: fd[3], defense_during: fd[fd.length-2], duration: dd(fd[fd.length-1], "permanent") };
            if(ability.subtype.substr(0,7)  == "absence") {
                ability.subtype = "absence";
                ability.absence_at = fd[5];
            }
        }
        // From By Through
        exp = new RegExp("^Protect " + targetType + " from `" + defenseAttackSubtypes + "` by " + targetType + " through " + defenseSubtypes + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "protecting", subtype: lc(fd[4]), target: fd[1], defense_from_type: rblc(fd[2]), defense_from_target: fd[3], defense_during: "all", duration: dd(fd[fd.length-1], "permanent") };
            if(ability.subtype.substr(0,7)  == "absence") {
                ability.subtype = "absence";
                ability.absence_at = fd[5];
            }
        }
        // From Through During
        exp = new RegExp("^Protect " + targetType + " from `" + defenseAttackSubtypes + "` through " + defenseSubtypes + " during " + defensePhases + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "protecting", subtype: lc(fd[3]), target: fd[1], defense_from_type: rblc(fd[2]), defense_from_target: "@All", defense_during: fd[fd.length-2], duration: dd(fd[fd.length-1], "permanent") };
            if(ability.subtype.substr(0,7)  == "absence") {
                ability.subtype = "absence";
                ability.absence_at = fd[4];
            }
        }
        // From Through
        exp = new RegExp("^Protect " + targetType + " from `" + defenseAttackSubtypes + "` through " + defenseSubtypes + attrDuration + "$", "g");
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
        exp = new RegExp("^Apply " + attributeName + " to " + targetType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "applying", subtype: "add", target: fd[2], attribute: fd[1], duration: dd(fd[3], "permanent") };
        }
        // standard applying with parameter
        exp = new RegExp("^Apply " + attributeName + " to " + targetType + attrDuration + " " + attrData + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "applying", subtype: "add", target: fd[2], attribute: fd[1], duration: dd(fd[3], "permanent"), attr_index: 1, attr_value: fd[fd.length-1] };
        }
        // Remove Attribute
        exp = new RegExp("^Remove " + attributeName + " from " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "applying", subtype: "remove", target: fd[2], attribute: fd[1] };
        }
        // Change Attribute Value
        exp = new RegExp("^Change " + attributeName + " value `" + attrIndex + "` to `" + attrValue + "` for " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "applying", subtype: "change", target: fd[4], attribute: fd[1], attr_index: +fd[2], attr_value: fd[3]  };
        }
        /** REDIRECTING **/
        // redirect from all
        exp = new RegExp("^Redirect `" + redirectSubtype + "` to " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "redirecting", subtype: fd[1], target: fd[2], source: "@All" };
        }
        // redirect from certain players
        exp = new RegExp("^Redirect `" + redirectSubtype + "` from " + targetType + " to " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "redirecting", subtype: fd[1], target: fd[3], source: fd[2] };
        }
        /** VOTE MANIPULATION **/
        // manipulation by absolute value
        exp = new RegExp("^Manipulate " + targetType + "'s `" + manipSubtype + "` to `" + num + "`" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "manipulating", subtype: "absolute", target: fd[1], manip_type: fd[2], manip_value: +fd[3], duration: dd(fd[4], "permanent") };
        }
        // manipulation by relative value
        exp = new RegExp("^Manipulate " + targetType + "'s `" + manipSubtype + "` by `" + num + "`" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "manipulating", subtype: "relative", target: fd[1], manip_type: fd[2], manip_value: +fd[3], duration: dd(fd[4], "permanent") };
        }
        /** WHISPERING **/
        // manipulation by absolute value
        exp = new RegExp("^Whisper to " + locationType + " as " + targetType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "whispering", target: fd[1], disguise: fd[2], duration: dd(fd[3], "permanent") };
        }
        /** JOINING **/
        // default joining
        exp = new RegExp("^Join " + groupType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "joining", subtype: "add", target: "@Self", group: fd[1], membership_type: "member", duration: dd(fd[2], "persistent") };
        }
        // joining with specific membership type
        exp = new RegExp("^Join " + groupType + " as `" + joiningSubtype + "`" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "joining", subtype: "add", target: "@Self", group: fd[1], membership_type: lc(fd[2]), duration: dd(fd[3], "persistent") };
        }
        // add somebody else 
        exp = new RegExp("^Add " + targetType + " to " + groupType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "joining", subtype: "add", target: fd[1], group: fd[2], membership_type: "member", duration: dd(fd[3], "persistent") };
        }
        // add somebody else as a specific membership type
        exp = new RegExp("^Add " + targetType + " to " + groupType + " as `" + joiningSubtype + "`" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "joining", subtype: "add", target: fd[1], group: fd[2], membership_type: lc(fd[3]), duration: dd(fd[4], "persistent") };
        }
        // default leaving
        exp = new RegExp("^Leave " + groupType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "joining", subtype: "remove", target: "@Self", group: fd[1] };
        }
        // remove somebody else
        exp = new RegExp("^Remove " + targetType + " from " + groupType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "joining", subtype: "remove", target: fd[1], group: fd[2] };
        }
        /** GRANTING **/
        // default granting
        exp = new RegExp("^Grant " + targetType + " to " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "granting", subtype: "add", target: fd[2], role: fd[1] };
        }
        // revoking
        exp = new RegExp("^Revoke " + targetType + " from " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "granting", subtype: "remove", target: fd[2], role: fd[1] };
        }
        // transfer
        exp = new RegExp("^Transfer " + targetType + " from " + targetType + " to " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "granting", subtype: "transfer", target: fd[2], role: fd[1], transfer_to: fd[3] };
        }
        /** LOYALTY **/
        // loyalty
        exp = new RegExp("^Loyalty to " + locationType + " \\(" + loyaltySubtype + "\\)$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "loyalty", subtype: fd[2], target: fd[1] };
        }
        /** OBSTRUCTING **/
        // obstruct all
        exp = new RegExp("^Obstruct " + targetType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "obstructing", target: fd[1], duration: dd(fd[2], "permanent") };
        }
        // obstruct specific ability type
        exp = new RegExp("^Obstruct " + abilityType + " for " + targetType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "obstructing", target: fd[2], duration: dd(fd[3], "permanent"), obstructed_ability: lc(fd[1]), obstructed_subtype: "", custom_feedback: "" };
        }
        // obstruct specific ability subtype
        exp = new RegExp("^Obstruct " + abilitySubtype + " for " + targetType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            fd = fd.filter(el => el); // filter out empty capture groups
            ability = { type: "obstructing", target: fd[3], duration: dd(fd[4], "permanent"), obstructed_ability: lc(fd[1].replace(fd[2], "").trim()), obstructed_subtype: lc(fd[2]), custom_feedback: "" };
        }
        // obstruct specific ability type; custom feedback
        exp = new RegExp("^Obstruct " + abilityType + " for " + targetType + " ⇒ `" + str + "`" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "obstructing", target: fd[2], duration: dd(fd[4], "permanent"), obstructed_ability: lc(fd[1]), obstructed_subtype: "", custom_feedback: [{chance: 1, feedback: fd[3]}] };
        }
        // obstruct specific ability subtype; custom feedback
        exp = new RegExp("^Obstruct " + abilitySubtype + " for " + targetType + " ⇒ `" + str + "`" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            fd = fd.filter(el => el); // filter out empty capture groups
            ability = { type: "obstructing", target: fd[3], duration: dd(fd[5], "permanent"), obstructed_ability: lc(fd[1].replace(fd[2], "").trim()), obstructed_subtype: lc(fd[2]), custom_feedback: [{chance: 1, feedback: fd[4]}] };
        }
        // obstruct specific ability type; double custom feedback
        exp = new RegExp("^Obstruct " + abilityType + " for " + targetType + " ⇒ \\(" + decNum + ":`" + str + "`," + decNum + ":`" + str + "`\\)" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "obstructing", target: fd[2], duration: dd(fd[7], "permanent"), obstructed_ability: lc(fd[1]), obstructed_subtype: "", custom_feedback: [{chance: +fd[3], feedback: fd[4]},{chance: +fd[5], feedback: fd[6] }] };
        }
        // obstruct specific ability subtype; double custom feedback
        exp = new RegExp("^Obstruct " + abilitySubtype + " for " + targetType + " ⇒ \\(" + decNum + ":`" + str + "`," + decNum + ":`" + str + "`\\)" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            fd = fd.filter(el => el); // filter out empty capture groups
            ability = { type: "obstructing", target: fd[3], duration: dd(fd[8], "permanent"), obstructed_ability: lc(fd[1].replace(fd[2], "").trim()), obstructed_subtype: lc(fd[2]), custom_feedback: [{chance: +fd[4], feedback: fd[5]},{chance: +fd[6], feedback: fd[7] }] };
        }
        /** POLL MANIPULATING **/
        // Poll duplication/addtion
        exp = new RegExp("^Add `" + str + "` Poll$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "poll", subtype: "addition", target: fd[1] };
        }
        // Creates a new poll
        exp = new RegExp("^Create `" + str + "` Poll in " + locationType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "poll", subtype: "creation", target: fd[1], poll_location: fd[2] };
        }
        // Cancel polls resulting ability
        exp = new RegExp("^Cancel `" + str + "` Poll$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "poll", subtype: "cancelling", target: fd[1] };
        }
        // Delete a poll
        exp = new RegExp("^Delete `" + str + "` Poll$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "poll", subtype: "deletion", target: fd[1] };
        }
        // Delete a poll
        exp = new RegExp("^Manipulate `" + str + "` Poll \\(" + targetType + " is `" + pollManipManipSubtype + "`\\)$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "poll", subtype: "manipulation", target: fd[1], manip_target: fd[2], manip_type: lc(fd[3]) };
        }
        /** ANNOUNCEMENTS **/
        // reveal
        exp = new RegExp("^Reveal " + targetType + " to " + locationType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "announcement", target: fd[2], info: fd[1] };
        }
        // reveal
        exp = new RegExp("^(Learn|Know) " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "announcement", target: "@Self", info: fd[2] };
        }
        /** ROLE CHANGE **/
        // role change
        exp = new RegExp("^Role Change " + targetType + " to " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "changing", subtype: "role", target: fd[1], change_to: fd[2] };
        }
        // alignment change
        exp = new RegExp("^Alignment Change " + targetType + " to " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "changing", subtype: "alignment", target: fd[1], change_to: fd[2] };
        }
        // group change
        exp = new RegExp("^Group Change " + targetType + " to " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "changing", subtype: "group", target: fd[1], change_to: fd[2] };
        }
        /** COPYING **/
        // copy abilities, target to self
        exp = new RegExp("^Copy " + targetType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "copying", subtype: "ability", target: fd[1], copy_to: "@Self", duration: dd(fd[2], "permanent") };
        }
        // copy abilities, target to target2
        exp = new RegExp("^Copy " + targetType + " to " + targetType + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "copying", subtype: "ability", target: fd[1], copy_to: fd[2], duration: dd(fd[3], "permanent") };
        }
        // copy abilities, target to target
        exp = new RegExp("^Duplicate " + targetType + "'s abilities" + attrDuration + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "copying", subtype: "ability", target: fd[1], copy_to: fd[1], duration: dd(fd[2], "permanent") };
        }
        // full copy
        exp = new RegExp("^Full Copy " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "copying", subtype: "full", target: fd[1], copy_to: "@Self", suppressed: false, duration: dd(fd[2], "permanent") };
        }
        // full copy, surpressed
        exp = new RegExp("^Full Copy " + targetType + " \\(Suppressed\\)$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "copying", subtype: "full", target: fd[1], copy_to: "@Self", suppressed: true, duration: dd(fd[2], "permanent") };
        }
        /** CHOICES **/
        
        /** WIP - NEEDS DOING **/
        
        /** ASCEND DESCEND **/
        // ascend
        exp = new RegExp("^Ascend$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "ascend" };
        }
        // descend
        exp = new RegExp("^Descend$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "descend" };
        }
        /** DISBAND **/
        // disband self
        exp = new RegExp("^Disband$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "disband", target: "@Self" };
        }
        // disband
        exp = new RegExp("^Disband " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "disband", target: fd[1] };
        }
        /** COUNTING **/
        // increment self by 1
        exp = new RegExp("^Increment Counter$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "increment", counter_value: 1, target: "@Self" };
        }
        // decrement self by 1
        exp = new RegExp("^Decrement Counter$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "decrement", counter_value: 1, target: "@Self" };
        }
        // increment self by value
        exp = new RegExp("^Increment Counter by " + num + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "increment", counter_value: fd[1], target: "@Self" };
        }
        // decrement self by value
        exp = new RegExp("^Decrement Counter by " + num + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "decrement", counter_value: fd[1], target: "@Self" };
        }
        // set counter to value
        exp = new RegExp("^Set Counter to " + num + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "set", counter_value: fd[1], target: "@Self" };
        }
        // increment self by 1, for target
        exp = new RegExp("^Increment Counter for " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "increment", counter_value: 1, target: fd[1] };
        }
        // decrement self by 1, for target
        exp = new RegExp("^Decrement Counter for " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "decrement", counter_value: 1, target: fd[1] };
        }
        // increment self by value, for target
        exp = new RegExp("^Increment Counter by " + num + " for " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "increment", counter_value: fd[1], target: fd[2] };
        }
        // decrement self by value, for target
        exp = new RegExp("^Decrement Counter by " + num + " for " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "decrement", counter_value: fd[1], target: fd[2] };
        }
        // set counter to value, for target
        exp = new RegExp("^Set Counter to " + num + " for " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "counting", subtype: "set", counter_value: fd[1], target: fd[2] };
        }
        /** CONVERSATION RESET **/
        // conversation reset self
        exp = new RegExp("^Conversation Reset$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "reset", target: "@Self" };
        }
        // conversation reset target
        exp = new RegExp("^Conversation Reset " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "reset", target: fd[1] };
        }
        /** CANCEL **/
        // cancel
        exp = new RegExp("^Cancel$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "cancel", cancel_with: "Failure" };
        }
        // cancel with specific result
        exp = new RegExp("^Cancel with (Failure|Success|" + rawStr + ")$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "cancel", cancel_with: fd[1] };
        }
        /** SWITCHING **/
        // switching
        exp = new RegExp("^Switch with " + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "switching", target: fd[1] };
        }
        /** PROCESS/EVALUATE **/
        // process
        exp = new RegExp("^Process:$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "process" };
        }
        // evaluate
        exp = new RegExp("^Evaluate:$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "evaluate" };
        }
        /** FEEDBACK */
        // just feedback
        exp = new RegExp("^" + targetType + "$", "g");
        fd = exp.exec(abilityLine);
        if(fd) {
            ability = { type: "feedback", feedback: fd[1] };
        }
        
        /** Ability Types End */
        if(ability) {
            //console.log("IDENT", ability);
            trigger[1][a] = { depth: (+bullets.indexOf(trigger[1][a].trim()[0])) + 1, ability: ability, parameters: { restrictions: parsedRestrictions, scaling: parsedScaling, direct: cDirect, repeating: cRepeating, visitless: cVisitless, forced: cForced, forced_sel: cForcedSelection } };
            if(peCond) trigger[1][a].condition = peCond;
        } else if(abilityLine == "") {
            trigger[1][a] = { depth: (+bullets.indexOf(trigger[1][a].trim()[0])) + 1, ability: { type: "blank" }, parameters: { } };
        } else {
            //console.log("UNIDENT", abilityLine);
            trigger[1][a] = { depth: (+bullets.indexOf(trigger[1][a].trim()[0])) + 1, ability: { type: "error" }, parameters : { failed_ability: trigger[1][a] } };
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

// parse phase
function phaseParse(dn, num) {
    return (dn == "Day" ? "D" : "N") + num;
}

function parseTriggers(inputLines) {

    let curTriggerType = null;
    let curTrigger = [];
    let unique = false;
    let triggers = [];

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


function deepEqual(object1, object2) {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);

    if(keys1.length !== keys2.length) {
        return false;
    }

    for(const key of keys1) {
        const val1 = object1[key];
        const val2 = object2[key];
        const areObjects = isObject(val1) && isObject(val2);
        if (
            areObjects && !deepEqual(val1, val2) ||
            !areObjects && val1 !== val2
        ) {
            return false;
        }
    }

    return true;
}

function isObject(object) {
  return object != null && typeof object === 'object';
}

function deepCopy(el) {
    return JSON.parse(JSON.stringify(el));
}