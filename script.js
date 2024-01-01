let input = "Immediate Night: Role Investigate @Selection (SD, WD)\nImmediate Night: Attribute Investigate @Selection for `Enchanted` (SD, WD)\nImmediate: Investigate `Huntress` Count (WD)\nImmediate: Target @Selection (Player) \nImmediate: Target @Selection (Player) [Quantity: 1]\nOn Killed: [Condition: @Target exists]\n  • Process: Attack @Target\n  • Evaluate: @Result is `Success`: Reveal `Huntress @Self killed @Target` to #story_time";

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

// general
var targetType = "(`[^`]*`|@\\S*)";

// specific
var investAffected = " ([\\(\\),SDWD ]*)?";

function parseAbilities(trigger) {
	for(let a in trigger[1]) {
		let abilityLine = trigger[1][a];
		let ability = null;
		let exp, found;
		
		// Role/align/cat/class Invest
		exp = new RegExp("(Role|Alignment|Category|Class) Investigate " + targetType + investAffected, "g");
		found = exp.exec(abilityLine);
		if(found) {
			ability = { type: "investigation", subtype: found[1].toLowerCase(), target: found[2], ...parseInvestAffected(found[3]) };
		}
		found = null;
		// Attribute invest
		exp = new RegExp("Attribute Investigate " + targetType + " for " + targetType + investAffected, "g");
		found = exp.exec(abilityLine);
		if(found) {
			ability = { type: "investigation", subtype: "attribute", target: found[1], attribute: found[2], ...parseInvestAffected(found[3]) };
		}
		found = null;
		// Role Count invest
		exp = new RegExp("Investigate " + targetType + " Count" + investAffected, "g");
		found = exp.exec(abilityLine);
		if(found) {
			ability = { type: "investigation", subtype: "count", target: found[1], ...parseInvestAffected(found[2]) };
		}
		found = null;
		
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