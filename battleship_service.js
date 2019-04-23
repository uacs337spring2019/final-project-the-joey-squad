/*
	Joey McMaster
	CSC337, Spring 2019
	Project 11, battleship_service.js
	Implements the webservice needed to play battleship on the website.
*/
"use strict";
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const PORT = 3000;
let fs = require('fs');
let _CPUBoard = [];
let _CPUDisplay = [];
let _HumanDisplay = [];
let _HumanBoard = [];
let _cpumovemode = 0; // 0 = Has no hits, chooses a random spot. 1 = CPU knows about a human ship and is targeting it.
let _lastx = 0;
let _lasty = 0;
let _ranonce = false;
app.use(express.static('public'));
/**
	Gets data from the request,
	Runs correct responce and sends it.
*/
app.get('/', function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	if (!_ranonce) {
		startupPrep();
		_ranonce = true;
	}
	let win = parseInt(req.query.win);
	let x = parseInt(req.query.x);
	let y = parseInt(req.query.y);
	console.log("win = " + win);
	if (win == 100) { // The request for what the CPU's data is.
		res.send(JSON.stringify(_CPUBoard));
	} else if (win == 1000) { // The request for the last move.
		let data = [];
		data[0] = _lastx;
		data[1] = _lasty;
		res.send(JSON.stringify(data));
	} else if (win == 10000) {
		loadOldState();
		let data = {};
		data["humanraw"] = [];
		data["humandisplay"] = [];
		data["cpuraw"] = [];
		data["cpudisplay"] = [];
		for(let x = 0; x < 10; x++) {
			data["cpuraw"][x] = [];
			data["cpudisplay"][x] = [];
			data["humanraw"][x] = [];
			data["humandisplay"][x] = [];
			for(let y = 0; y < 10; y++) {
				data["cpuraw"][x][y] = _CPUBoard[x][y];
				data["cpudisplay"][x][y] = _CPUDisplay[x][y];
				data["humanraw"][x][y] = _HumanBoard[x][y];
				data["humandisplay"][x][y] =_HumanDisplay[x][y];
			}
		}
		res.send(JSON.stringify(data));
	} else {
		humanMakeMove(x,y);
		let responce = CPUMakeMove();
		saveData();
		res.send(responce);
	}
})
/**
	Hadels the post request when posting a comment.
*/
app.post('/', jsonParser, function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	if (!_ranonce) {
		startupPrep();
		_ranonce = true;
	}
	let data = req.body.data;
	init(data);
	console.log(data);
	res.send(JSON.stringify(_CPUBoard));
});
/**
	A helper function for the app.post method.
*/
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
function loadOldState() {
	let file = null;
	try {
		file = fs.readFileSync("lastgamestate.txt", 'utf8');
	} catch(e) {
		console.log("IO ERROR!");
		return;
	}
	let strings = file.split("|");
	if (strings.length != 5) {
		console.log("Invalid File Format!");
		return;
	}
	for(let z = 0; z < 5; z++) {
		if (z == 4) {
			_cpumovemode = parseInt(strings[0]);
			_lastx = parseInt(strings[2]);
			_lasty = parseInt(strings[4]);
		} else {
			let count = 0;
			let nums = strings[z].split(" ");
			console.log("len of nums = " + nums.length);
			for(let x = 0; x < 10; x++) {
				for(let y = 0; y < 10; y++) {
					if (count < 100) {
						let i = parseInt(nums[count]);
						count++;
						if (z == 0) {
							_CPUBoard[x][y] = i;
						} else if (z == 1) {
							_CPUDisplay[x][y] = i;
						} else if (z == 2) {
							_HumanBoard[x][y] = i;
						} else {
							_HumanDisplay[x][y] = i;
						}
					}
				}
			}
		}
	}
}
function saveData() {
	let content = "";
	for(let type = 0; type < 4; type++) {
		for(let x = 0; x < 10; x++) {
			for(let y = 0; y < 10; y++) {
				if (type == 0) {
					content += _CPUBoard[x][y] + " ";
				} else if (type == 1) {
					content += _CPUDisplay[x][y] + " ";
				} else if (type == 2) {
					content += _HumanBoard[x][y] + " ";
				} else {
					content += _HumanDisplay[x][y] + " ";
				}
			}
		}
		content += "|";
	}
	content += _cpumovemode + " ";
	content += _lastx + " ";
	content += _lasty + " ";
	fs.writeFile("lastgamestate.txt", content, function(err) {
		if(err) {
			return console.log(err);
		}
	});
}
function humanMakeMove(x,y) {
	if (_CPUBoard[x][y] != 0) {
		_HumanDisplay[x][y] = 1;
	} else {
		_HumanDisplay[x][y] = 0;
	}
}
function CPUMakeMove() {
	if (_cpumovemode == 0) {
		let first = true;
		let runs = 0;
		while(first || _CPUDisplay[_lastx][_lasty] != -1) {
			first = false;
			if (_cpumovemode == 0) {
				_lastx += 2;
				if (_lastx == 10) {
					_lastx = 1;
					_lasty++;
				} else if (_lastx == 11) {
					_lastx = 0;
					_lasty++;
				}
				if (_lasty > 9) {
					_lasty = 0;
				}
				
			}
			runs++;
			if (runs == 10) {
				if (_lastx == 9) {
					_lastx = 8;
				} else {
					_lastx++;
				}
			}
		}
		doCPUMove(_lastx,_lasty);
	} else {
		// Cheaty, but creates an AI that isn't a complete idiot. 
		// Seems to be balanced after play testing 
		let target = _HumanBoard[_lastx][_lasty];
		let u = -1;
		let d = -1;
		let l = -1;
		let r = -1;
		if (_lastx != 0) {
			l = _HumanBoard[_lastx - 1][_lasty];
		}
		if (_lastx != 9) {
			r = _HumanBoard[_lastx + 1][_lasty];
		}
		if (_lasty != 0) {
			u = _HumanBoard[_lastx][_lasty - 1];
		}
		if (_lasty != 9) {
			d = _HumanBoard[_lastx][_lasty + 1];
		}
		let x = _lastx;
		let y = _lasty;
		if (l == target) {
			while(_lastx != 0 && _HumanBoard[_lastx - 1][_lasty] == target) {
				if (_lastx != 0 && _CPUDisplay[_lastx - 1][_lasty] == -1 && _HumanBoard[_lastx - 1][_lasty] == target) {
					doCPUMove(_lastx - 1,_lasty);
					return _CPUDisplay;
				}
				_lastx--;
			}
		}
		_lastx = x;
		_lasty = y;
		if (r == target) {
			while(_lastx != 9 && _HumanBoard[_lastx + 1][_lasty] == target) {
				if (_lastx != 9 && _CPUDisplay[_lastx + 1][_lasty] == -1 && _HumanBoard[_lastx + 1][_lasty] == target) {
					doCPUMove(_lastx + 1,_lasty);
					return _CPUDisplay;
				}
				_lastx++;
			}
		}
		_lastx = x;
		_lasty = y;
		if (u == target) {
			console.log("going up");
			while(_lasty != 0 && _HumanBoard[_lastx][_lasty - 1] == target) {
				console.log("going up in while loop");
				if (_lasty != 0 && _CPUDisplay[_lastx][_lasty - 1] == -1 && _HumanBoard[_lastx][_lasty - 1] == target) {
					console.log("going up should return");
					doCPUMove(_lastx,_lasty - 1);
					return _CPUDisplay;
				}
				_lasty--;
			}
		}
		_lastx = x;
		_lasty = y;
		if (d == target) {
			console.log("going down");
			while(_lasty != 9 && _HumanBoard[_lastx][_lasty + 1] == target) {
				console.log("going down in while loop");
				if (_lasty != 9 && _CPUDisplay[_lastx][_lasty + 1] == -1 && _HumanBoard[_lastx][_lasty + 1] == target) {
					console.log("going down should return");
					doCPUMove(_lastx,_lasty + 1);
					return _CPUDisplay;
				}
				_lasty++;
			}
		}
		_lastx = x;
		_lasty = y;
		console.log("Failed to find another hit move, going back to random moves!")
		_cpumovemode = 0;
		CPUMakeMove(); // No move made, go back to original state.
	}
	return _CPUDisplay;
}
function doCPUMove(x,y) {
	_lastx = x;
	_lasty = y;
	if (_HumanBoard[x][y] != 0) {
		_CPUDisplay[x][y] = 1;
		_cpumovemode = 1;
	} else {
		_CPUDisplay[x][y] = 0;
	}
}
function init(humanBoardState) {
	_CPUBoard = [];
	_CPUDisplay = [];
	_HumanBoard = [];
	_HumanDisplay = [];
	for(let x = 0; x < 10; x++) {
		_CPUBoard[x] = [];
		_CPUDisplay[x] = [];
		_HumanBoard[x] = [];
		_HumanDisplay[x] = [];
		for(let y = 0; y < 10; y++) {
			_CPUBoard[x][y] = 0;
			_CPUDisplay[x][y] = -1;
			_HumanBoard[x][y] = humanBoardState[x][y];
			_HumanDisplay[x][y] = -1;
		}
	}
	placeShips();
	// Random starting place to make guesses.
	_lastx = Math.floor(Math.random() * 10);
	_lasty = Math.floor(Math.random() * 10);
	_cpumovemode = 0;
}
/**
	x, the x value of the north left point.
	y, the y value of the north left point.
	length, the length of the ship
	down, boolean, If true, the ship is up/down, otherwise its left/right
*/
function isValidShipPlacement(x,y,length,down) {
	if (down) {
		for(let yy = y; yy < y + length; yy++) {
			if (yy > 9 || x > 9 || y > 9) {
				return false;
			}
			if (_CPUBoard[x][yy] != 0) {
				return false;
			}
		}
	} else {
		for(let xx = x; xx < x + length; xx++) {
			if (xx > 9 || x > 9 || y > 9) {
				return false;
			}
			if (_CPUBoard[xx][y] != 0) {
				return false;
			}
		}
	}
	return true;
}
/**
	ASSUMES VALID PARAMS, check first.
*/
function placeShip(x,y,length,id,down) {
	if (down) {
		for(let yy = y; yy < y + length; yy++) {
			_CPUBoard[x][yy] = id;
		}
	} else {
		for(let xx = x; xx < x + length; xx++) {
			_CPUBoard[xx][y] = id;
		}
	}
}
function shipNumberToLength(id) {
	if (id == 1) {
		return 5;
	} else if (id == 2) {
		return 4;
	} else if (id == 5) {
		return 2;
	} else {
		return 3;
	}
}
function placeShips() {
	for(let ship = 1; ship < 6; ship++) {
		let length = shipNumberToLength(ship);
		let dirnumber = Math.floor(Math.random() * 10);
		let updown = false;
		if (dirnumber < 5) {
			updown = true;
		}
		let newx = 1;
		let newy = 1;
		if (updown) {
			newx = Math.floor(Math.random() * 10);
			newy = Math.floor(Math.random() * (11 - length));
		} else {
			newx = Math.floor(Math.random() * (11 - length));
			newy = Math.floor(Math.random() * 10);
		}
		let inloop = true;
		let failsafe = 0;
		while(inloop && failsafe < 100) {
			if (failsafe > 70) {
				console.log("Fail safe = " + failsafe);
			}
			if (isValidShipPlacement(newx,newy, length, updown)) {
				placeShip(newx,newy,length,ship,updown);
				inloop = false;
			}
			newx++;
			if (newx > 9) {
				newx = 0;
				newy++;
				if (newy > 9) {
					newy = 0;
				}
			}
			failsafe++;
		}
		//console.log("Fail safe value after exiting = " + failsafe);
		//console.log(_CPUBoard);
	}
}
function startupPrep() {
	_CPUBoard = [];
	_CPUDisplay = [];
	_HumanBoard = [];
	_HumanDisplay = [];
	for(let x = 0; x < 10; x++) {
		_CPUBoard[x] = [];
		_CPUDisplay[x] = [];
		_HumanBoard[x] = [];
		_HumanDisplay[x] = [];
		for(let y = 0; y < 10; y++) {
			_CPUBoard[x][y] = 0;
			_CPUDisplay[x][y] = -1;
			_HumanBoard[x][y] = 0;
			_HumanDisplay[x][y] = -1;
		}
	}
}
app.listen(PORT);