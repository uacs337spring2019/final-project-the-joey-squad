/*  Joey McMaster
	CSC337
	Spring 2019
	Project 11
	Goal is implement the Battleship client side code.
*/
"use strict";
(function() {
	const PORT = 3000;
	const HOST = "http://localhost";
	let _grid = []; // My data where my ships area
	let _dishmgrid = []; // My data in format to interact with CPU moves
	let _dishgrid = [];  // The data that is displayed to my targeting area
	let _hostilegrid = []; // The CPU data.
	let _selectedShipType = 1; // Carrier is the default ship type.
	let _placedshipdir = 0; // 0 = Up/down (axis point up), 1 = left/right (axis point left)
	let _totalhitcount = 0; // Keeps count of hits
	let _totalmisscount = 0;
	let _previewOldx = -1;
	let _previewOldy = -1;
	let _gameState = 0;
	let _allowMove = false;
	/** Sets up the main method, the starting point of the program.
		Sets up the color picker colors and sets up the handlers. */
	function main() {
		document.getElementById("restartbutton").onclick = restartGame;
		document.getElementById("loadbutton").onclick = loadOldData;
		init();
		initSetUpShips();
	}
	/**
		Translates a click on the grid and runs a move.
		when the user can move.
	*/
	function makeAMove() {
		if (_allowMove) {
			let canvas = document.getElementById("targetingGrid");
			let bound = canvas.getBoundingClientRect();
			let xx = parseInt(event.clientX - bound.left);
			let yy = parseInt(event.clientY - bound.top);
			let q = cavasCordsToGridId(xx,yy);
			let x = q[0];
			let y = q[1];
			if (_dishgrid[x][y] == -1) {
				if (_hostilegrid[x][y] != 0) {
					_dishgrid[x][y] = 1;
					//console.log("Hit with id: " + _hostilegrid[x][y]);
					if (sankShip(true, x,y)) {
						appendAShipSank(true,getShipNameById(_hostilegrid[x][y]));
					}
					_totalhitcount++;
				} else {
					_dishgrid[x][y] = 0;
					_totalmisscount++;
				}
				//console.log(_dishgrid);
				sendMoveToServer(x,y);
				reDrawTargetingGrids();
				let win = getWinStatus();
				if (win == 1) {
					alert("We win! Lets play again!");
					restartGame();
					return;
				} else if (win == -1) {
					alert("We lost! Lets play again!");
					restartGame();
					return;
				}
				updateInfoPannel();
			}
		}
	}
	/**
		Determines if the player or computer has won or if the game is still going.
	*/
	function getWinStatus() {
		if (_totalhitcount == 17) {
			return 1;
		} else {
			let count = 0;
			for(let x = 0; x < 10; x++) {
				for(let y = 0; y < 10; y++) {
					if (_dishmgrid[x][y] == 1) {
						count++;
					}
				}
			}
			if (count == 17) {
				return -1;
			}
		}
		return 0;
	}
	/**
		Fetches the CPU data from the server.
	*/
	function getServerData() {
		fetch(HOST + ":" + PORT +"/?win=100&x=0&y=0")
		.then(checkStatus)
		.then(function(res) {
			let data = JSON.parse(res);
			for(let x = 0; x < 10; x++) {
				for(let y = 0; y < 10; y++) {
					_hostilegrid[x][y] = data[x][y];
				}
			}
		})
		.catch(function(error) {
			console.log(error);
			restartGame();
		});
	}
	/**
		Sends the move the human player made to the server.
	*/
	function sendMoveToServer(x,y) {
		//console.log("Send move to server");
		_allowMove = false;
		let win = getWinStatus();
		// AJAX Call 1
		// Tell the server if we have won or not and get the servers game state.
		fetch(HOST + ":" + PORT +"/?win=" + win + "&x=" + x +"&y=" + y)
		.then(checkStatus)
		.then(function(res) {
			if (win == 1 || win == -1) {
				return;
			}
			let data = JSON.parse(res);
			for(let x = 0; x < 10; x++) {
				for(let y = 0; y < 10; y++) {
					_dishmgrid[x][y] = data[x][y];
				}
			}
		})
		.catch(function(error) {
			console.log(error);
			_allowMove = true;
		});
		if (win == -1 || win == 1) {
			_allowMove = true;
			return;
		}
		// AJAX Call 2
		// Ask for the cords of the move that the CPU just made.
		fetch(HOST + ":" + PORT +"/?win=" + 1000 + "&x=0&y=0")
		.then(checkStatus)
		.then(function(res) {
			let data = JSON.parse(res);
			if (sankShip(false, data[0], data[1])) {
				appendAShipSank(false,getShipNameById(_grid[data[0]][data[1]]));
			}
			reDrawTargetingGrids();
			_allowMove = true;
		})
		.catch(function(error) {
			console.log(error);
			_allowMove = true;
		});
	}
	/**
		runs the init code.
		Sets up the 2d arrays.
		Draws the left grid.
	*/
	function init() {
		for(let x = 0; x < 10; x++) {
			_grid[x] = [];
			_hostilegrid[x] = [];
			_dishgrid[x] = [];
			_dishmgrid[x] = [];
			for(let y = 0; y < 10; y++) {
				_grid[x][y] = 0;
				_hostilegrid[x][y] = -1;
				_dishgrid[x][y] = -1;
				_dishmgrid[x][y] = -1;
			}
		}
		reDrawPlaceShips();
	}
	/**
		Sets the ship to be placed. 
	*/
	function setNewShipToPlace() {
		if (_gameState != 0) {
			console.log("Tried to place new ships, game already started!");
			return;
		}
		let canvas = document.getElementById("dragwindow");
		let bound = canvas.getBoundingClientRect();
		let y = parseInt(event.clientY - bound.top);
		let oldshiptype = _selectedShipType;
		if (y < 65) {
			//console.log("Carrier!");
			if (shipExistsInData(1)) {
				console.log("Already placed this!");
				return;
			}
			_selectedShipType = 1;
		} else if (y < 130) {
			//console.log("Battleship!");
			if (shipExistsInData(2)) {
				console.log("Already placed this!");
				return;
			}
			_selectedShipType = 2;
		} else if (y < 195) {
			//console.log("Destroyer!");
			if (shipExistsInData(3)) {
				console.log("Already placed this!");
				return;
			}
			_selectedShipType = 3;
		} else if (y < 260) {
			//console.log("Submarine!");
			if (shipExistsInData(4)) {
				console.log("Already placed this!");
				return;
			}
			_selectedShipType = 4;
		} else if (y < 325) {
			//console.log("Patrol Boat!");
			if (shipExistsInData(5)) {
				console.log("Already placed this!");
				return;
			}
			_selectedShipType = 5;
		} else if (y < 375) { 
			if (_placedshipdir == 0) {
				_placedshipdir = 1;
			} else {
				_placedshipdir = 0;
			}
		} else {
			// The reset button was pressed,
			// Reset the state.
			//console.log("Reset!");
			_selectedShipType = 1;
			init();
			return;
		}
		// If we changed to a new ship type, verify its valid.
		if (oldshiptype == _selectedShipType) {
			for(let x = 0; x < 10; x++) {
				for(let y = 0; y < 10; y++) {
					if (_grid[x][y] == _selectedShipType) {
						// We already placed this ship.
						_selectedShipType = oldshiptype;
						return;
					}
				}
			}
		}
	}
	/**
		draws to the canvas the area to palce the ships and selector canvas.
	*/
	function initSetUpShips() {
		let canvas = document.getElementById("dragwindow");
		let context = canvas.getContext("2d");
		//let bound = canvas.getBoundingClientRect();
		
		document.getElementById("dragwindow").onmousedown = setNewShipToPlace;
		document.getElementById("mydrawgrid").onmousedown = placeNewShip;
		document.getElementById("mydrawgrid").onmousemove = previewNewShip;
		
		context.fillStyle = "rgba(0,255,0,1)";
		context.fillRect(0, 0, 100,424);
		context.fillStyle = "rgba(255,0,0,1)";
		context.fillRect(0, 0, 100,75);
		
		context.fillStyle = "rgba(0,255,255,1)";
		context.fillRect(0, 65, 100,65);
		context.fillStyle = "rgba(0,255,0,1)";
		context.fillRect(0, 130, 100,65);
		context.fillStyle = "rgba(255,0,255,1)";
		context.fillRect(0, 195, 100,65);
		context.fillStyle = "rgba(255,255,0,1)";
		context.fillRect(0, 260, 100,65);
		
		context.fillStyle = "rgba(150,150,150,1)";
		context.fillRect(0, 325, 100,50);
		context.fillStyle = "rgba(255,255,255,1)";
		context.fillRect(0, 375, 100,47);
		
		context.fillStyle = "rgba(0,0,0,1)";
		context.font = "18px Times New Roman";
		context.fillText("Carrier", 5,30);
		context.fillText("Battleship", 5,95);
		context.fillText("Destroyer", 5,160);
		context.fillText("Submarine", 5,225);
		context.fillText("Patrol Boat",5,290);
		context.fillText("Rotate Boat",5,355);
		context.fillText("Reset Boats",5,400);
	}
	/**
		Tranlaste a user click and places the ship the user wanted to place, if valid.
	*/
	function placeNewShip() {
		if (_gameState == 1) {
			return;
		}
		let canvas = document.getElementById("mydrawgrid");
		//let context = canvas.getContext("2d");
		let bound = canvas.getBoundingClientRect();
		let xx = parseInt(event.clientX - bound.left);
		let yy = parseInt(event.clientY - bound.top);
		let q = cavasCordsToGridId(xx,yy);
		let x = q[0];
		let y = q[1];
		if (isShipPlacementValid(x,y)) {
			if (_placedshipdir == 0) {
				for(let z = y; z < (y + getCurrentShipLength()); z++) {
					_grid[x][z] = _selectedShipType;
				}
			} else {
				for(let z = x; z < (x + getCurrentShipLength()); z++) {
					_grid[z][y] = _selectedShipType;
				}
			}
			setNextShipType();
			reDrawPlaceShips();
		}
	}
	/**
		Renders an updated canvas with the place the current ship would go.
		Then reverts the change in data.
	*/
	function previewNewShip() {
		if (_gameState == 1) {
			return;
		}
		let canvas = document.getElementById("mydrawgrid");
		//let context = canvas.getContext("2d");
		let bound = canvas.getBoundingClientRect();
		let xx = parseInt(event.clientX - bound.left);
		let yy = parseInt(event.clientY - bound.top);
		let q = cavasCordsToGridId(xx,yy);
		let x = q[0];
		let y = q[1];
		if (x == _previewOldx  && y == _previewOldy) {
			return; // Don't bother re-running this
		}
		if (x < 0 || x > 9) {
			console.log("ERROR: x is out of range!");
			console.log("x = " + x);
			return;
		}
		_previewOldx = x;
		_previewOldy = y;
		if (isShipPlacementValid(x,y)) {
			if (_placedshipdir == 0) {
				for(let z = y; z < (y + getCurrentShipLength()); z++) {
					_grid[x][z] = _selectedShipType;
				}
			} else {
				for(let z = x; z < (x + getCurrentShipLength()); z++) {
					_grid[z][y] = _selectedShipType;
				}
			}
			reDrawPlaceShips();
			if (_placedshipdir == 0) {
				for(let z = y; z < (y + getCurrentShipLength()); z++) {
					_grid[x][z] = 0;
				}
			} else {
				for(let z = x; z < (x + getCurrentShipLength()); z++) {
					_grid[z][y] = 0;
				}
			}
		}
	}
	/**
		Determines if the ship placement is valid or not.
	*/
	function isShipPlacementValid(x,y) {
		let len = getCurrentShipLength();
		if (_placedshipdir == 0) {
			let result = y + len;
			if (result > 10) {
				return false;
			}
			for(let z = y; z < (y + getCurrentShipLength()); z++) {
				if (_grid[x][z] != 0) {
					return false;
				}
			}
		} else {
			let result = x + len;
			if (result > 10) {
				return false;
			}
			for(let z = x; z < (x + getCurrentShipLength()); z++) {
				if (_grid[z][y] != 0) {
					return false;
				}
			}
		}
		return true;
	}
	/**
		Converts a set of canvas coordinates to grid ids that can be used 
		to index into the various 2d arrays.
	*/
	function cavasCordsToGridId(x,y) {
		// 424 - 424
		let retval = [];
		x -= 24;
		y -= 24;
		if (x < 0) {
			x = 0;
		}
		if (y < 0) {
			y = 0;
		}
		x = Math.floor(x / 40);
		y = Math.floor(y / 40);
		retval[0] = x;
		retval[1] = y;
		return retval;
	}
	/**
		From the current ship type
		Fetches the ship length associated with it.
	*/
	function getCurrentShipLength() {
		if (_selectedShipType == 1) {
			return 5;
		} else if (_selectedShipType == 2) {
			return 4;
		} else if (_selectedShipType == 5) {
			return 2;
		}
		return 3;
	}
	/**
		Auto selects the next ship type to be placed after one is placed 
		(should be called afterwards)
		Starts the networked game if out of ships to place.
	*/
	function setNextShipType() {
		let count = 0;
		while(count < 5) {
			count++;
			_selectedShipType++;
			if (_selectedShipType > 5) {
				_selectedShipType = 1;
			}
			if (!shipExistsInData(_selectedShipType)) {
				return;
			}
		}
		startGame();
	}
	/**
		Determines if a ship of the inputed id was placed or not in the data.
	*/
	function shipExistsInData(num) {
		for(let x = 0; x < 10; x++) {
			for(let y = 0; y < 10; y++) {
				if (_grid[x][y] == num) {
					return true;
				}
			}
		}
		return false;
	}
	/**
		Updates the canvas in use during the game.
	*/
	function reDrawTargetingGrids() {
		let canvas = document.getElementById("targetingGrid");
		let context = canvas.getContext("2d");
		//let bound = canvas.getBoundingClientRect();
		context.fillStyle = "rgba(0,0,255,1)";
		context.strokeStyle = "rgba(0,0,255,1)";
		context.fillRect(0, 0, 424,424);
		
		context.fillStyle = "rgba(0,0,0,1)";
		context.font = "24px Times New Roman";
		context.fillText("A", 5, 45);
		context.fillText("B", 5, 85);
		context.fillText("C", 5, 125);
		context.fillText("D", 5, 165);
		context.fillText("E", 5, 205);
		context.fillText("F", 5, 245);
		context.fillText("G", 5, 285);
		context.fillText("H", 5, 325);
		context.fillText("I", 5, 365);
		context.fillText("J", 5, 405);
		context.fillText("1", 33, 20);
		context.fillText("2", 73, 20);
		context.fillText("3", 113, 20);
		context.fillText("4", 153, 20);
		context.fillText("5", 193, 20);
		context.fillText("6", 233, 20);
		context.fillText("7", 273, 20);
		context.fillText("8", 313, 20);
		context.fillText("9", 353, 20);
		context.fillText("10", 390, 20);
		for(let x = 0; x < 10; x++) {
			for(let y = 0; y < 10; y++) {
				context.fillStyle = getMoveColor(_dishgrid[x][y]);
				context.strokeStyle = getMoveColor(_dishgrid[x][y]);
				context.beginPath();
				context.arc((x * 40) + 40, (y * 40) + 40, 15, 0, 2 * Math.PI);
				context.fill();
			}
		}
		
		canvas = document.getElementById("mydrawgrid");
		context = canvas.getContext("2d");
		//bound = canvas.getBoundingClientRect();
		context.fillStyle = "rgba(0,0,255,1)";
		context.strokeStyle = "rgba(0,0,255,1)";
		context.fillRect(0, 0, 424,424);
		
		context.fillStyle = "rgba(0,0,0,1)";
		context.font = "24px Times New Roman";
		context.fillText("A", 5, 45);
		context.fillText("B", 5, 85);
		context.fillText("C", 5, 125);
		context.fillText("D", 5, 165);
		context.fillText("E", 5, 205);
		context.fillText("F", 5, 245);
		context.fillText("G", 5, 285);
		context.fillText("H", 5, 325);
		context.fillText("I", 5, 365);
		context.fillText("J", 5, 405);
		context.fillText("1", 33, 20);
		context.fillText("2", 73, 20);
		context.fillText("3", 113, 20);
		context.fillText("4", 153, 20);
		context.fillText("5", 193, 20);
		context.fillText("6", 233, 20);
		context.fillText("7", 273, 20);
		context.fillText("8", 313, 20);
		context.fillText("9", 353, 20);
		context.fillText("10", 390, 20);
		for(let x = 0; x < 10; x++) {
			for(let y = 0; y < 10; y++) {
				context.fillStyle = getMoveColor(_dishmgrid[x][y]);
				context.strokeStyle = getMoveColor(_dishmgrid[x][y]);
				context.beginPath();
				context.arc((x * 40) + 40, (y * 40) + 40, 15, 0, 2 * Math.PI);
				context.fill();
			}
		}
	}
	/**
		appends to the HTML document the second grid.
	*/
	function drawTargetingGrid() {
		let aigrid = document.getElementById("aigrid");
		let canvas = document.createElement("canvas");
		canvas.id = "targetingGrid";
		canvas.width = 424;
		canvas.height = 424;
		aigrid.appendChild(canvas);
	}
	/**
		redraws the left grid when placing ships.
	*/
	function reDrawPlaceShips() {
		let canvas = document.getElementById("mydrawgrid");
		let context = canvas.getContext("2d");
		//let bound = canvas.getBoundingClientRect();
		context.fillStyle = "rgba(0,0,255,1)";
		context.strokeStyle = "rgba(0,0,255,1)";
		context.fillRect(0, 0, 424,424);
		
		context.fillStyle = "rgba(0,0,0,1)";
		context.font = "24px Times New Roman";
		context.fillText("A", 5, 45);
		context.fillText("B", 5, 85);
		context.fillText("C", 5, 125);
		context.fillText("D", 5, 165);
		context.fillText("E", 5, 205);
		context.fillText("F", 5, 245);
		context.fillText("G", 5, 285);
		context.fillText("H", 5, 325);
		context.fillText("I", 5, 365);
		context.fillText("J", 5, 405);
		context.fillText("1", 33, 20);
		context.fillText("2", 73, 20);
		context.fillText("3", 113, 20);
		context.fillText("4", 153, 20);
		context.fillText("5", 193, 20);
		context.fillText("6", 233, 20);
		context.fillText("7", 273, 20);
		context.fillText("8", 313, 20);
		context.fillText("9", 353, 20);
		context.fillText("10", 390, 20);
		for(let x = 0; x < 10; x++) {
			for(let y = 0; y < 10; y++) {
				context.fillStyle = getShipColors(_grid[x][y]);
				context.strokeStyle = getShipColors(_grid[x][y]);
				context.beginPath();
				context.arc((x * 40) + 40, (y * 40) + 40, 15, 0, 2 * Math.PI);
				context.fill();
			}
		}
	}
	/**
		Translates targeting ids to their circle colors.
	*/
	function getMoveColor(num) {
		if (num == -1) { // 0 = Unknown location
			return "rgba(0,0,0,1)";
		} else if (num == 0) { // Miss
			return "rgba(255,255,255,1)";
		} else if (num == 1) { // Hit
			return "rgba(255,0,0,1)"; 
		}
	}
	/**
		Translates ship ids to their circle colors.
	*/
	function getShipColors(num) {
		if (num == 0) { // 0 = Empty
			return "rgba(255,255,255,1)";
		} else if (num == 1) { // Carrier
			return "rgba(255,0,0,1)";
		} else if (num == 2) { // Battleship
			return "rgba(0,255,255,1)";
		} else if (num == 3) { // Destroyer
			return "rgba(0,255,0,1)";
		} else if (num == 4) { // Submarine
			return "rgba(255,0,255,1)";
		} else if (num == 5) { // Patrol Boat
			return "rgba(255,255,0,1)";
		}
	}
	/**
		Takes a ship id and determines its length from it.
	*/
	function shipIdToLength(num) {
		if (num == 1) {
			return 5;
		} else if (num == 2) {
			return 4;
		} else if (num == 5) {
			return 2;
		} else {
			return 3;
		}
	}
	/**
		Takes a ship id and determines its print name.
	*/
	function getShipNameById(num) {
		if (num == 1) {
			return "Carrier";
		} else if (num == 2) {
			return "Battleship";
		} else if (num == 3) {
			return "Destroyer";
		} else if (num == 4) {
			return "Submarine";
		} else if (num == 5) {
			return "Patrol Boat";
		}
	}
	/**
		Sends the users comment to the web service.
	*/
	function startGame() {
		let error = false;
		const message = {data: _grid};
		const fetchOptions = { 
			method : 'POST', headers : { 'Accept': 'application/json', 
			'Content-Type' : 'application/json' 
			},
		body : JSON.stringify(message) };
		fetch("http://localhost:" + PORT + "/", fetchOptions)
		.then(checkStatus)
		.catch(function(error) {
			console.log("Game failed to start!");
			console.log(error);
			error = true;
		});
		if (!error) {
			getServerData();
			_allowMove = true;
			_gameState = 1;
			drawTargetingGrid();
			reDrawTargetingGrids();
			// Disable direct interactions with the setup grid.
			//document.getElementById("mydrawgrid").onmousedown = doNothing;
			//document.getElementById("mydrawgrid").onmousemove = doNothing;
			document.getElementById("targetingGrid").onmousedown = makeAMove;
		}
	}
	/**
		Restarts the game.
	*/
	function restartGame() {
		_allowMove = true;
		_gameState = 0;
		document.getElementById("aigrid").innerHTML = "";
		document.getElementById("ShipsSank").innerHTML = "Ships Sank:";
		document.getElementById("HShipsSank").innerHTML = "Your Ships Sunk:";
		_totalhitcount = 0;
		_totalmisscount = 0;
		updateInfoPannel();
		init();
		initSetUpShips();
	}
	/**
		Updates the hits and misses part of the info pannel.
	*/
	function updateInfoPannel() {
		document.getElementById("Hits").innerHTML = "Hits: " + _totalhitcount;
		document.getElementById("Misses").innerHTML = "Misses: " + _totalmisscount;
	}
	/**
		Appends to the ships sank part of the info panel the name of the ship and who sank it.
	*/
	function appendAShipSank(human, str) {
		let n = document.createElement("br");
		if (human) {
			document.getElementById("ShipsSank").appendChild(n);
			document.getElementById("ShipsSank").innerHTML += str;
		} else {
			document.getElementById("HShipsSank").appendChild(n);
			document.getElementById("HShipsSank").innerHTML += str;
		}
	}
	/**
		Determines if a given hit sank a ship 
		I will assume this is called on a hit.
	*/
	function sankShip(humanplayer, xx, yy) {
		if (xx < 0 || yy < 0) {
			console.log("ERROR: sankShip x or y below 0!");
			return;
		}
		let grid = [];
		let targetinggrid = [];
		if (humanplayer) {
			grid = _hostilegrid;
			targetinggrid = _dishgrid;
		} else {
			grid = _grid;
			targetinggrid = _dishmgrid;
		}
		let target = grid[xx][yy];
		let length = shipIdToLength(target);
		// Get to start of the ship.
		if (xx != 0 && yy != 0) {
			if (grid[xx - 1][yy] == target) {
				xx--;
				while(xx > 0 && grid[xx- 1][yy] == target) {
					xx--;
				}
			} else if (grid[xx][yy - 1] == target) {
				yy--;
				while(yy > 0 && grid[xx][yy - 1] == target) {
					yy--;
				}
			}
		} else if (yy == 0 && xx > 0) {
			if (grid[xx - 1][yy] == target) {
				xx--;
				while(xx > 0 && grid[xx - 1][yy] == target) {
					xx--;
				}
			}
		} else if (xx == 0 && yy > 0) {
			if (grid[xx][yy - 1] == target) {
				yy--;
				while(yy > 0 && grid[xx][yy - 1] == target) {
					yy--;
				}
			}
		}
		//console.log("start of ship: " + xx + "," + yy);
		// At start of ship, Walk the entire ship length.
		let mod = 0;
		if (grid[xx][yy + 1] == target) {
			while((yy + mod) < 10 && targetinggrid[xx][yy + mod]  ==  1 && 
				grid[xx][yy + mod] == target && mod < length) {
				mod++;
			}
			if (mod == length) {
				return true;
			}
		} else if (grid[xx + 1][yy] == target) {
			while((xx + mod) < 10 && targetinggrid[xx + mod][yy]  ==  1 && 
				grid[xx + mod][yy] == target && mod < length) {
				mod++;
			}
			if (mod == length) {
				return true;
			}
		}
		return false;
	}
	/**
		Loads a previous game state from the server.
	*/
	function loadOldData() {
		if (_gameState == 0) {
			console.log("Must start a game before restoring an old one");
			return;
		}
		_totalhitcount = 0;
		_totalmisscount = 0;
		console.log("loadOldData called!");
		// AJAX Call 1
		// Tell the server to read in the data for the last save game state then send it. 
		fetch(HOST + ":" + PORT +"/?win=10000&x=0&y=0")
		.then(checkStatus)
		.then(function(res) {
			//console.log(res);
			let data = JSON.parse(res);
			for(let x = 0; x < 10; x++) {
				for(let y = 0; y < 10; y++) {
					_grid[x][y] = data.humanraw[x][y];
					_dishgrid[x][y] = data.humandisplay[x][y];
					_hostilegrid[x][y] = data.cpuraw[x][y];
					_dishmgrid[x][y] = data.cpudisplay[x][y];
					if (_dishgrid[x][y] == 1) {
						_totalhitcount++;
					} else if (_dishgrid[x][y] == 0) {
						_totalmisscount++;
					}
				}
			}
			reDrawTargetingGrids();
			updateInfoPannel();			
		});
	}
	/**
	* [COPIED DIRRECTLY FROM THE LECTURE SLIDES]
	* Takes a response from a web service, and returns that data within it.
	* If there was a problem, returns an error to be processed.
	*/
	function checkStatus(response) {
		if (response.status >= 200 && response.status < 300) {
			return response.text();
		} else {
			return Promise.reject(new Error(response.status+":"+response.statusText));
		}
	}
	window.onload = main;
})();