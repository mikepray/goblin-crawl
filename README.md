# GoblinCrawl

After [Dungeon Crawl Stone Soup](https://github.com/crawl/crawl), [Caves of Qud](https://www.cavesofqud.com). 

![splash screen](start-screen.png "Splash Screen")

![game screen](game-screen.png "Game Screen")

![dialog screen](dialog-screen.png "Dialog Screen")

Written in TypeScript and Node.js

You play as a goblin. Explore the world, talk to its inhabitants, eat skrunt eggs, and wage war upon the treacherous kobolds.

## Running

`npm run build && npm run start`

## Playing

You are the `@` sign. Empty floor tiles are `.` and dungeon walls are `#`. Other things in the dungeon will have a glyph (like `g` for goblins).

Use the arrow keys or vim keys (h, u, j, k, l, n, m) which allow diagonal movement. 

Bump into something to interact with it. If the creature can talk to you, it will open up a dialog window. Use the number keys to select an input.

While in the game window, use these keys to interact with the word:

`i` - inventory, allows you to (d)rop or (e)at items in your inventory
`g` - picks up an item from the ground and puts it in your inventory
`>` - descends a staircase (shown as `>`)
`<` - ascends a staircase (shown as `<`)
`^` - prays at an altar (shown as `^`)
`Escape` - closes a window and returns to the game
`Control + C` - quits the game

## Features

Random level generation, raycasting field of vision, ascending and descending staircases, creature dialog, items, random goblins farting

## Adding creatures, features, items

Names are used for lookups in the game, so make them unique. The game will load all .yaml files in a directory. All yaml files under `creatures/` will be loaded as creatures and the same for features and items. The name of the file is not important, only the extension (yaml or yml). Name and group the entities however you think is important for comprehension, but consider adding unique creatures to their own named files if they contain a lot of dialog. Look at the `types.ts` file to see what the valid types are. Eventually I will write a validator, but in the meantime common problems are forgetting the dash before array entries or using the wrong field name.

Creatures are anything that can attack, talk, or interact with the player. Items are items like eggs, weapons, books, etc. Features are 'dungeon features' that allow some other form of interaction, like staircases and altars, doors, portals, etc

## Writing creatures

Creatures are generally unique or not-unique. To make a unique creature, set `useDefiniteArticle` to true. This will remove `the` in front of game messages featuring the creature.

### Shouts

Creatures can "shout", that is, make exclamations that are added to the game messages. These are just flavor and don't have any in-game consequences. The `shoutChance` is out of 1000 and will be checked at every player turn. If it hits, the game will chose one of the shouts to add to the game messages.

### Dialog Trees and Conversation Branches

Creature dialog is a tree of conversation branches (actually an array of trees). You can add multiple top-level conversation branches to a creature and the game will choose one of these at random when the player interacts (bumps into) the creature. 

A dialog tree begins at the creature's `creatureSpeaks` which is presented to the player. The game then iterates through each child conversation branch (depth of one) and provides the `playerResponse` as a selectable response to the creature. If the player chooses a player response, the dialog tree is set to that new conversation branch, the `creatureSpeaks` is presented to the player, and the process begins again.

Dialog choices can have consequences - to give the player items upon a response selection, add any number of `actions` and any number of named items under `takePlayerItems`. The name of the item will be used to lookup the item against both the list of loaded items in the game and the player's inventory. If the player does not have that item, the `actionFailedBranch` will be set as the dialog conversation branch.

Any creature or player stats can be set by using `updateCreature` and `updatePlayer`, respectively.

Dialog conversations can be circular or move to a different leaf in the conversation tree. To do this, use `gotoBranch` and use the *exact* string of the `creatureSpeaks` value of the conversation branch you want the conversation to move to upon the player choosing the respective `playerResponse`.

## Spawning Items, Features, and Creatures 

All items, features, and creatures use the same logic to randomly spawn. The `branchSpawnRates` is a list of branch/levels with a `spawnCHance` and `maxSpawnNum`. When the player descends a level, the game will check the branch spawn rate for that level and check the spawn chance. To force a creature to spawn in a given dungeon level, set the `spawnChance` to 100. The game will spawn up to `maxSpawnNum` (but not necessarily spawn the creature unless the `spawnChance` is 100).

Currently, for a feature, item or creature to spawn in a level, it must have a `branchSpawnRate` for that level.

## Combat

There are the following skills that all actors (the player, NPCs, allies, and enemies) have, and can train:

### Skill Descriptions

- Cunning: the player's sneakiness, deceptiveness, ingenuity, and artfulness
- Savagery: the ability of the player to inflict fearsome blows
- Power: the natural reservoir of vital force that a player can project 
- Fortitude: the ability to shrug off injury, persist through pain or negative status effects
- Armor: the ability of the player to leverage body armor to resist damage
- Dodging: the ability of the player to avoid attacks

### Skill Usage

- Making an attack: Cunning, Savagery
- Overcoming a target's damage resistance and armor: Cunning, Savagery
- Dealing damage: Power
- Resisting damage: Fortitude, Armor
- Avoiding an attack: Dodging

The skill progression is logarithmic. Any wielded or worn item can apply any multiplier to the player's natural skill

Items like weapons apply a base modifier to the roll to hit, and use a dice roll to determine damage. E.g., a dagger might have a base attack bonus of 1 and a Cunning skill multiplier of 1.5. The player's Cunning skill might be 10:

`Attack bonus: ln(10 * 1.5) = 2.7 + 1 = floor(3.7) = 3`

The game rolls a dice and adds the attack bonus and compares to the target's Dodge roll, which includes the target's Dodge skill and any item multipliers. E.g., the target is wearing a shield that grants a +3 bonus and a 2x multiplier to the target's Dodge skill which is 8 base:

`Dodge bonus: ln(8 * 2) + 3 = floor(5.7) = 5`

The result is `1d20 + attack bonus compared to 10 + dodge bonus`

If the attack hits, then the game compares the attacker's Cunning, Savagery, and Power to the defender's Fortitude and Armor with a bonus from the weapon's damage bonus