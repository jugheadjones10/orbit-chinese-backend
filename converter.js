var xlsx = require('node-xlsx');
var fs = require('fs');

var obj = xlsx.parse(__dirname + '/高级成语100.xlsx'); // parses a file
var rows = [];
var writeStr = "";

var sheet = obj[0];
//loop through all rows in the sheet
for(var j = 0; j < sheet['data'].length; j++){
	//add the row to the rows array
	rows.push(sheet['data'][j][0]);
}

console.log(JSON.stringify(rows))

////creates the csv string to write it to a file
//for(var i = 0; i < rows.length; i++)
//{
//    writeStr += rows[i].join(",") + "\n";
//}

////writes to a file, but you will presumably send the csv as a      
////response instead
//fs.writeFile(__dirname + "/test.csv", writeStr, function(err) {
//    if(err) {
//        return console.log(err);
//    }
//    console.log("test.csv was saved in the current directory!");
//});

